# Technický slovník — iOS + WidgetKit (přípravná verze)

Tento Xcode projekt přidá malou iOS aplikaci pro přihlášení do stávajícího Supabase účtu a WidgetKit widget s denním slovíčkem (japonsky, anglicky, česky). Widget používá lokální kopii dat předanou aplikací; nepřistupuje k účtu ani heslu. Otevře stávající webový slovník po klepnutí.

## Stav
Zdroj je připraven pro otevření v Xcode na Macu. V tomto prostředí není Xcode, proto projekt nebyl sestaven ani nainstalován. Před instalací je potřeba nastavit App Group a podpis podle níže uvedených kroků.

## Nastavení v Xcode
1. Otevři `TechnickySlovnik.xcodeproj`.
2. U cílů **TechnickySlovnik** a **TechnickySlovnikWidgetExtension** nastav stejný Team a zapni Automatically manage signing.
3. Zaregistruj App Group v Apple Developer účtu (např. `group.cz.pokwerj84.technickyslovnik`) a vyber ho v Signing & Capabilities u obou cílů. Pokud změníš název, změň také `AppGroupID` v `SharedWord.swift` a entitlement soubory.
4. Zvol svůj iPhone jako run destination a spusť cíl **TechnickySlovnik**.
5. Přihlas se stejným e-mailem a heslem jako na webu, klepni na **Načíst slovíčka**.
6. Na iPhonu přidej widget Technický slovník na plochu.

Widget se aktualizuje podle plánování iOS; přesný čas aktualizace systém negarantuje. Otevření aplikace obnoví slovíčka z účtu. Data widgetu obsahují pouze tři výrazy slovíčka a jsou sdílena lokálně mezi aplikací a rozšířením.

## Poznámka k podpisu
Widget používá App Groups pro bezpečné sdílení lokálních dat mezi aplikací a widgetem. App Groups musí být registrovaná a povolená pro oba cíle; dostupnost této capability závisí na typu Apple Developer účtu. Bez ní nelze přenést uživatelská slovíčka do widgetu.
