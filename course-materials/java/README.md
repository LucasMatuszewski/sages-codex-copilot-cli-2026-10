# jFTP - ćwiczenie z istniejącym projektem Java

Na dzień 1 używamy rzeczywistego klienta Swing [sai-pullabhotla/jftp](https://github.com/sai-pullabhotla/jftp). Źródła w `app/jftp/`, zależność FTP API w `app/ftpapi/`, pochodzenie i licencje w [app/UPSTREAM.md](../../app/UPSTREAM.md). Starter zachowuje kod oryginału; nie zawiera gotowej modernizacji ani odpowiedzi do ćwiczenia.

## Przygotowanie

Wymagania i budowanie: [główny README](../../README.md) oraz [instrukcja aplikacji](../../app/README.md). W katalogu głównym:

```bash
mvn -f app/pom.xml verify
```

```bash
java -jar app/launcher/target/jftp-workshop.jar
```

Pozostaw FTP rozłączone. W panelu lokalnym przejdź do `app/fixtures/local-files/`, sprawdź plik tekstowy i nazwę z polskimi znakami. Nie potrzebujesz serwera FTP, konta ani hasła. Przy braku GUI wykonaj testy i analizę repozytorium; oznacz w raporcie, że interfejsu nie sprawdzono.

## Zadanie 1: mapa repozytorium i ryzyka

Poproś Codex o analizę `app/`, `AGENTS.md` i `docs/PRD.md`. Nie polecaj mu wyszukiwania po całej bibliotece kursowej. Zapisz:

1. Skąd uruchamia się aplikacja i jak budowane są moduły?
2. Co pochodzi z upstreamu, a co przygotowano na kurs?
3. Jak odróżnisz kompilację, test zasobów, uruchomienie GUI i test transferu?
4. Które stwierdzenia masz potwierdzone kodem lub poleceniem, a które wymagają sprawdzenia?

Wykonaj tę samą analizę w Copilot CLI. Porównaj konkretne wskazania plików i dowody, nie długość odpowiedzi.

## Zadanie 2: test charakteryzujący, bez sieci

Wybierz `com.myjavaworld.jftp.JFTPUtil.getTimeString(int)` w `app/jftp/src/main/java/`. To lokalne formatowanie czasu, które nie wymaga GUI ani połączenia FTP. Zapisz granice wejścia, które chcesz zbadać, np. przejście między minutami i godzinami. Sprawdź obserwowane zachowanie i samodzielnie napisz test JUnit w `app/launcher/src/test/java/`.

Nie zmieniaj jeszcze produkcyjnego kodu. Test charakteryzujący ma opisać oryginał. Jeśli zachowanie budzi wątpliwości, rozdziel w raporcie obserwację, własną hipotezę i pytanie o wymaganie. Dla zmiany zachowania najpierw uzgodnij wymaganie oraz PRD, potem napisz odpowiedni test i zaimplementuj zmianę. Starter nie podaje oczekiwanych wyników ani gotowego testu tej funkcji.

```bash
mvn -f app/pom.xml test
```

## Zadanie 3: mała zmiana z PRD i ADR

Z prowadzącym wybierz jedną zmianę, poprawę błędu albo refaktoryzację. Napisz krótki PRD dla tej zmiany oraz ADR, jeśli podejmujesz decyzję techniczną. Określ zakres plików, warunek akceptacji, sposób testowania i granice uprawnień agenta. Dopiero wtedy zleć implementację, przejrzyj diff i sprawdź rezultat.

Oddajesz mapę repozytorium z dowodami, własny test, PRD/ADR uzgodnionej zmiany oraz raport z dokładnymi poleceniami i wynikami. [Pełna agenda](../../AGENDA.md) opisuje dalszą część warsztatu; ćwiczenie jFTP stanowi jego pierwszy projekt.
