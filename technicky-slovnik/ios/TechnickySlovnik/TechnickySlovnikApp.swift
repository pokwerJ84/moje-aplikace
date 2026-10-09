import SwiftUI
import Security
import WidgetKit

private enum SupabaseConfig {
    static let url = URL(string: "https://pornzqperiptczusueso.supabase.co")!
    static let publishableKey = "sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n"
}

@MainActor
final class DictionarySession: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var words: [DictionaryWord] = []
    @Published var status = "Přihlas se a načti slovíčka do widgetu."
    @Published var isBusy = false

    private var accessToken: String?
    private let keychainService = "cz.pokwerj84.technickyslovnik"
    private let keychainAccount = "supabase.refresh-token"

    init() {
        if let saved = Self.loadSecret(service: keychainService, account: keychainAccount) {
            Task { await refreshAndLoad(refreshToken: saved) }
        }
    }

    func signInAndLoad() async {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !password.isEmpty else {
            status = "Zadej e-mail a heslo."
            return
        }
        isBusy = true
        defer { isBusy = false }
        do {
            var request = URLRequest(url: SupabaseConfig.url.appendingPathComponent("auth/v1/token").appending(queryItems: [URLQueryItem(name: "grant_type", value: "password")]))
            request.httpMethod = "POST"
            request.setValue(SupabaseConfig.publishableKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
            let response: AuthResponse = try await send(request)
            accessToken = response.access_token
            Self.saveSecret(response.refresh_token, service: keychainService, account: keychainAccount)
            password = ""
            try await loadWords()
        } catch {
            status = "Přihlášení nebo načtení slovíček se nepodařilo: \(error.localizedDescription)"
        }
        isBusy = false
    }

    func refresh() async {
        guard let token = Self.loadSecret(service: keychainService, account: keychainAccount) else {
            status = "Nejdřív se přihlas e-mailem a heslem."
            return
        }
        await refreshAndLoad(refreshToken: token)
    }

    private func refreshAndLoad(refreshToken: String) async {
        isBusy = true
        defer { isBusy = false }
        do {
            var request = URLRequest(url: SupabaseConfig.url.appendingPathComponent("auth/v1/token").appending(queryItems: [URLQueryItem(name: "grant_type", value: "refresh_token")]))
            request.httpMethod = "POST"
            request.setValue(SupabaseConfig.publishableKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(["refresh_token": refreshToken])
            let response: AuthResponse = try await send(request)
            accessToken = response.access_token
            Self.saveSecret(response.refresh_token, service: keychainService, account: keychainAccount)
            try await loadWords()
        } catch {
            status = "Obnov přihlášení: \(error.localizedDescription)"
        }
    }

    private func loadWords() async throws {
        guard let accessToken else { throw AppError.missingSession }
        var components = URLComponents(url: SupabaseConfig.url.appendingPathComponent("rest/v1/dictionary_words"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "select", value: "id,ja,en,cs"),
            URLQueryItem(name: "order", value: "created_at.asc")
        ]
        var request = URLRequest(url: components.url!)
        request.setValue(SupabaseConfig.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let result: [DictionaryWord] = try await send(request)
        guard !result.isEmpty else { throw AppError.noWords }
        words = result
        let data = try JSONEncoder().encode(result)
        guard let defaults = UserDefaults(suiteName: WidgetData.appGroupID) else { throw AppError.appGroupUnavailable }
        defaults.set(data, forKey: WidgetData.wordsKey)
        defaults.set(Date(), forKey: WidgetData.refreshedAtKey)
        WidgetCenter.shared.reloadAllTimelines()
        status = "Načteno \(result.count) slovíček. Widget je aktualizovaný."
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "HTTP chyba"
            throw AppError.server(message)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    func signOut() {
        Self.deleteSecret(service: keychainService, account: keychainAccount)
        accessToken = nil
        words = []
        UserDefaults(suiteName: WidgetData.appGroupID)?.removeObject(forKey: WidgetData.wordsKey)
        WidgetCenter.shared.reloadAllTimelines()
        status = "Odhlášeno."
    }

    private struct AuthResponse: Decodable {
        let access_token: String
        let refresh_token: String
    }
    private enum AppError: LocalizedError {
        case missingSession, noWords, appGroupUnavailable, server(String)
        var errorDescription: String? {
            switch self {
            case .missingSession: return "Chybí přihlašovací relace."
            case .noWords: return "Ve slovníku nejsou žádná slovíčka."
            case .appGroupUnavailable: return "App Group není nastavená pro oba cíle."
            case .server(let text): return text
            }
        }
    }

    private static func saveSecret(_ value: String, service: String, account: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(query as CFDictionary)
        var insert = query
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(insert as CFDictionary, nil)
    }
    private static func loadSecret(service: String, account: String) -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    private static func deleteSecret(service: String, account: String) {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] as CFDictionary)
    }
}

@main
struct TechnickySlovnikApp: App {
    @StateObject private var session = DictionarySession()
    var body: some Scene {
        WindowGroup { ContentView().environmentObject(session) }
    }
}

struct ContentView: View {
    @EnvironmentObject private var session: DictionarySession
    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Image(systemName: "character.book.closed.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(Color(red: 0.78, green: 0.62, blue: 0.30))
                Text("Technický slovník").font(.largeTitle.bold()).foregroundStyle(Color(red: 0.25, green: 0.16, blue: 0.25))
                Text("Denní slovíčko přímo na ploše iPhonu").foregroundStyle(.secondary)
                if session.words.isEmpty {
                    TextField("E-mail", text: $session.email).textInputAutocapitalization(.never).keyboardType(.emailAddress).autocorrectionDisabled().textFieldStyle(.roundedBorder)
                    SecureField("Heslo", text: $session.password).textFieldStyle(.roundedBorder)
                    Button { Task { await session.signInAndLoad() } } label: {
                        Label("Přihlásit a načíst slovíčka", systemImage: "arrow.down.circle.fill").frame(maxWidth: .infinity)
                    }.buttonStyle(.borderedProminent).tint(Color(red: 0.42, green: 0.28, blue: 0.40)).disabled(session.isBusy)
                } else {
                    Button { Task { await session.refresh() } } label: {
                        Label("Načíst slovíčka", systemImage: "arrow.clockwise").frame(maxWidth: .infinity)
                    }.buttonStyle(.borderedProminent).tint(Color(red: 0.42, green: 0.28, blue: 0.40)).disabled(session.isBusy)
                    Button("Odhlásit", role: .destructive) { session.signOut() }
                }
                if session.isBusy { ProgressView() }
                Text(session.status).font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
                Spacer()
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.97, green: 0.95, blue: 0.91))
            .task { await session.refresh() }
        }
    }
}
