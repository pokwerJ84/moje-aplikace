import SwiftUI
import WidgetKit

struct WordEntry: TimelineEntry {
    let date: Date
    let word: DictionaryWord?
}

struct WordProvider: TimelineProvider {
    func placeholder(in context: Context) -> WordEntry {
        WordEntry(date: .now, word: DictionaryWord(id: "demo", ja: "電圧", en: "Voltage", cs: "Napětí"))
    }
    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        completion(WordEntry(date: .now, word: loadWord(for: Date())))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let now = Date()
        let entry = WordEntry(date: now, word: loadWord(for: now))
        let next = Calendar.current.startOfDay(for: now).addingTimeInterval(24 * 60 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
    private func loadWord(for date: Date) -> DictionaryWord? {
        guard let data = UserDefaults(suiteName: WidgetData.appGroupID)?.data(forKey: WidgetData.wordsKey),
              let words = try? JSONDecoder().decode([DictionaryWord].self, from: data), !words.isEmpty else { return nil }
        let day = Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
        return words[(day - 1) % words.count]
    }
}

struct WordWidgetView: View {
    let entry: WordEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "character.book.closed.fill").foregroundStyle(Color(red: 0.78, green: 0.62, blue: 0.30))
                Text("TECHNICKÝ SLOVNÍK").font(.caption2.weight(.bold)).tracking(0.7)
                Spacer()
            }
            if let word = entry.word {
                Text(word.ja).font(.system(size: 25, weight: .bold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.65)
                    .foregroundStyle(Color(red: 0.35, green: 0.22, blue: 0.36))
                Text(word.en).font(.headline).lineLimit(1).minimumScaleFactor(0.75)
                Text(word.cs).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                Spacer(minLength: 0)
                Text("SLOVÍČKO DNE").font(.caption2.weight(.semibold)).foregroundStyle(Color(red: 0.67, green: 0.49, blue: 0.20))
            } else {
                Spacer()
                Text("Otevři aplikaci a načti slovíčka.").font(.subheadline)
                Spacer()
            }
        }
        .padding()
        .containerBackground(Color(red: 0.97, green: 0.95, blue: 0.91), for: .widget)
        .widgetURL(WidgetData.dictionaryURL)
    }
}

@main
struct TechnickySlovnikWidget: Widget {
    let kind = "TechnickySlovnikWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WordProvider()) { entry in
            WordWidgetView(entry: entry)
        }
        .configurationDisplayName("Slovíčko dne")
        .description("Japonské, anglické a české slovíčko na ploše.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
