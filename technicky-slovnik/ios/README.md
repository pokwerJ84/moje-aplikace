# Technický slovník — nativní iOS obal a WidgetKit

iOS aplikace otevře současný webový slovník uvnitř WKWebView, takže používá stejné obrazovky, jazyky, účty, slovní zásobu, nástroje, postupy a fotografie jako webová aplikace. Nemá vlastní kopii těchto obrazovek. Barvy a ikona vycházejí ze současného švestkovo-zlatého vzhledu a stejné ikony knihy s „あ“.

Widget zobrazuje denní slovíčko japonsky, anglicky a česky. Webová aplikace bezpečně předává widgetu jen tato slovíčka pomocí nativního mostu; heslo ani přihlašovací tokeny do widgetu neposílá. Klepnutí na widget otevře slovník. Po změně seznamu se widget požádá o aktualizaci; přesný čas zobrazení aktualizace určuje iOS.

## Otevření a instalace
1. Stáhni nebo naklonuj větev `ios-widget-v1` repozitáře.
2. Na Macu otevři `technicky-slovnik/ios/TechnickySlovnik.xcodeproj`.
3. U cílů **TechnickySlovnik** a **TechnickySlovnikWidgetExtension** vyber stejný Team a zapni automatické podepisování.
4. Zaregistruj App Group v Apple Developer účtu (výchozí ID je `group.cz.pokwerj84.technickyslovnik`) a přiřaď ji oběma cílům. Pokud změníš ID, uprav `WidgetData.appGroupID` a entitlement soubory.
5. Vyber iPhone jako Run Destination a spusť cíl **TechnickySlovnik**.
6. Přihlas se do slovníku stejně jako na webu. Jakmile se načte seznam slovíček, přidej widget **Slovíčko dne** na plochu iPhonu.

## Poznámky
- Webová část vyžaduje připojení k internetu; po přihlášení si pamatuje relaci v úložišti WKWebView.
- App Groups musí být zaregistrovaná a povolená pro oba cíle, aby aplikace mohla sdílet seznam slov s widgetem.
- WidgetKit aktualizuje obsah podle vlastního plánování iOS.
- Projekt zde nebylo možné sestavit ani spustit, protože pracovní prostředí nemá Xcode. Xcode build na Macu je potřeba ověřit před instalací.
