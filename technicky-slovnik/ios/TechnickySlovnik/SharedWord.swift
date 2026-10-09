import Foundation

enum WidgetData {
    static let appGroupID = "group.cz.pokwerj84.technickyslovnik"
    static let wordsKey = "widget.vocabulary.v1"
    static let refreshedAtKey = "widget.refreshedAt"
    static let dictionaryURL = URL(string: "https://pokwerj84.github.io/moje-aplikace/technicky-slovnik/site/")!
}

struct DictionaryWord: Codable, Identifiable {
    let id: String
    let ja: String
    let en: String
    let cs: String
}
