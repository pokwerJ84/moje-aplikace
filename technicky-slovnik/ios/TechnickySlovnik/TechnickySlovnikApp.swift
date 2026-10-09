import SwiftUI
import WebKit
import WidgetKit

final class WidgetBridge: NSObject, WKScriptMessageHandler {
    private let defaults = UserDefaults(suiteName: WidgetData.appGroupID)

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "widgetWords",
              let raw = message.body as? [[String: Any]] else { return }
        let words = raw.compactMap { item -> DictionaryWord? in
            guard let id = item["id"] as? String,
                  let ja = item["ja"] as? String,
                  let en = item["en"] as? String,
                  let cs = item["cs"] as? String else { return nil }
            return DictionaryWord(id: id, ja: ja, en: en, cs: cs)
        }
        guard !words.isEmpty, let defaults,
              let data = try? JSONEncoder().encode(words),
              defaults.data(forKey: WidgetData.wordsKey) != data else { return }
        defaults.set(data, forKey: WidgetData.wordsKey)
        defaults.set(Date(), forKey: WidgetData.refreshedAtKey)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

struct DictionaryWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let content = WKUserContentController()
        let themeBootstrap = WKUserScript(
            source: "if (!localStorage.getItem('technical-dictionary-theme')) localStorage.setItem('technical-dictionary-theme', 'dark');",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        content.addUserScript(themeBootstrap)
        content.add(context.coordinator.bridge, name: "widgetWords")
        let config = WKWebViewConfiguration()
        config.userContentController = content
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.125, green: 0.09, blue: 0.145, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: WidgetData.dictionaryURL))
        context.coordinator.webView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "widgetWords")
        webView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let bridge = WidgetBridge()
        weak var webView: WKWebView?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // The web app posts its current vocabulary through the native bridge after rendering.
        }
    }
}

@main
struct TechnickySlovnikApp: App {
    var body: some Scene {
        WindowGroup {
            DictionaryWebView()
                .ignoresSafeArea(edges: .bottom)
                .background(Color(red: 0.125, green: 0.09, blue: 0.145))
        }
    }
}
