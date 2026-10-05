# Codex i GitHub Copilot CLI - warsztat Java (Sages / Sygnity)

5-8 października 2026, 09:00-17:00 czasu polskiego, Zoom, własne komputery. Głównym narzędziem jest OpenAI Codex, drugim GitHub Copilot CLI. Pierwszego dnia analizujemy rzeczywisty projekt Java: [jFTP autorstwa Sai Pullabhotli](https://github.com/sai-pullabhotla/jftp), klient FTP/FTPS z interfejsem Swing. Kolejny projekt Java wybierzemy podczas dalszej części warsztatu.

- [Strona szkolenia i materiały](https://devpowers.com/szkolenia/sages/sygnity-05-10/)
- [Pełna agenda](AGENDA.md)
- [Ćwiczenie jFTP](course-materials/java/README.md)
- [Źródła, rewizje i licencje](app/UPSTREAM.md)
- [Zakres przygotowania startera](docs/PRD.md)

## Start

Potrzebujesz Git, **JDK 17** (`java` i `javac` w PATH), **Maven 3.9.x** (`mvn` w PATH) oraz graficznego pulpitu. JDK 17 jest sprawdzonym środowiskiem tego startera; obsługa innych wersji wymaga weryfikacji. Pierwsze budowanie pobiera zależności z Maven Central. Node.js służy narzędziom agentowym, nie aplikacji jFTP.

Polecenia działają w terminalu Linux/macOS i w natywnym PowerShell na Windows, bez WSL. Uruchamiaj je kolejno:

```bash
git clone https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10.git
```

```bash
cd sages-codex-copilot-cli-2026-10
```

```bash
mvn -f app/pom.xml verify
```

```bash
java -jar app/launcher/target/jftp-workshop.jar
```

Starter uruchamia oryginalny interfejs jFTP, zapisuje ustawienia w ignorowanym `app/.workshop-home/` i wyłącza automatyczne sprawdzanie aktualizacji przez istniejące API preferencji. Pozostaw FTP rozłączone. W panelu lokalnym możesz przeglądać syntetyczne pliki w `app/fixtures/local-files/`. Źródła i oryginalne POM-y zachowano bez zmian; budowanie obsługują osobne POM-y kursowe w `app/build-bridge/`.

Jeśli korzystasz z firmowego proxy lub mirroru Maven, użyj swojej zatwierdzonej konfiguracji Maven. Repozytorium nie wymaga klucza API do uruchomienia aplikacji. [Dokładne wymagania i problemy z uruchomieniem](app/README.md).

## Praca bez GUI i bez sieci

Dwa testy dymne sprawdzają classpath i zasoby, bez otwierania okna oraz bez połączenia FTP:

```bash
mvn -f app/pom.xml test
```

Po pierwszym udanym `verify`, z zachowanym lokalnym cache Maven:

```bash
mvn -o -f app/pom.xml verify
```

Brak pulpitu nie blokuje analizy repozytorium, PRD, ADR ani testów jednostkowych. Uruchomienie GUI na takim komputerze kończy się komunikatem i kodem 2. Kompilacja i testy dymne nie potwierdzają transferów FTP ani pełnej poprawności aplikacji.

## Biblioteka dodatkowa

Pełne `course-materials/`, konfiguracje innych agentów, prompty, skrypty, dane syntetyczne i archiwum wcześniejszych kursów zostały zachowane. Są opcjonalną biblioteką; bieżący kurs obejmuje Codex i Copilot CLI. [Slajdy](course-materials/slides/README.md), [konfiguracje agentów](course-materials/agent-configs/README.md), [pełne prompty historyczne](course-materials/Prompt%20examples/) i [przykłady code review w CI](course-materials/cicd-headless/README.md) wymagają sprawdzenia przed użyciem w konkretnym środowisku.

Agent pracujący nad aplikacją otwiera materiały kursowe wyłącznie na wyraźną prośbę. Przykładowe PRD i ADR z biblioteki nie są wymaganiami jFTP. Do ćwiczeń używamy danych syntetycznych; przeglądaj diff, wyniki testów i zgody na narzędzia.
