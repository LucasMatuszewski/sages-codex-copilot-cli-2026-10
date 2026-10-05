---
title: "Codex i GitHub Copilot CLI - od zera do zespołu agentów AI"
trainer: "Łukasz Matuszewski"
---

# Codex i GitHub Copilot CLI - od zera do zespołu agentów AI

Szkolenie zamknięte: pełny program kursu „Codex – od zera do zespołu agentów AI" rozszerzony o praktyczną pracę z GitHub Copilot CLI i wykorzystanie obu narzędzi w codziennej pracy zespołu.

| Program: | 4 dni (9:00–16:00) |
| :---- | :---- |
| **Format:** | zdalnie, na żywo |
| **Dedykowany dla:** | dwóch grup po około 11 programistów, DevOpsów i osób technicznych pracujących głównie w Javie oraz rozwijających istniejące systemy |
| **Główne narzędzia:** | OpenAI Codex (CLI, Desktop App, Cloud) + GitHub Copilot CLI |
| **Prowadzący:** | Łukasz Matuszewski |

## O szkoleniu

Większość zespołów korzysta z agentów AI w trybie „zapytaj i popraw”: prompt, wygenerowany kod, ręczna weryfikacja, kolejny prompt. Działa przy drobnych zmianach, ale rozsypuje się przy większych zadaniach – agent gubi kontekst projektu, łamie konwencje, a przegląd wyniku zajmuje więcej czasu niż napisanie kodu ręcznie.

Warsztat pokazuje inne podejście: Context Engineering zamiast promptowania. Uczestnicy konfigurują agentów na poziomie projektu, definiują specjalistów do konkretnych zadań i uruchamiają zespoły agentów pracujących równolegle. Cały proces przechodzą na przygotowanej aplikacji Java, podobnej do systemów rozwijanych przez zespół: od analizy istniejącego repozytorium i konfiguracji kontekstu, przez implementację zmiany, poprawę błędu i refaktoryzację, po testy, code review oraz pracę z pull requestem.

Program obejmuje pełny zakres szkolenia otwartego (dni 1–3), dostosowany do pracy programistów Java z istniejącymi systemami. W dniach 1–3 przy każdym zagadnieniu, w którym oba narzędzia realnie się pokrywają - weryfikacja środowiska, AGENTS.md, narzędzia CLI, sub-agenci, code review i CI - pokazuję również, jak wygląda to w GitHub Copilot CLI. Dzień 4 jest w całości poświęcony Copilot CLI i funkcjom charakterystycznym dla ekosystemu GitHub: custom agents, integracji z repozytorium, delegowaniu zadań do Copilot coding agent oraz świadomemu doborowi narzędzia do typu zadania. Ostateczny wariant projektu, platformę repozytorium i używane integracje doprecyzujemy po ankiecie technicznej przed szkoleniem.

## Dla kogo

- programiści Java, backend i full-stack z co najmniej 1–2 latami doświadczenia komercyjnego

- zespoły projektowe pracujące nad istniejącymi systemami, w tym aplikacjami rozwijanymi od wielu lat

- DevOpsi, tech leadzi i architekci odpowiedzialni za standardy pracy z AI w repozytorium

- osoby wdrażające automatyzację testów, code review i pipeline'ów CI z udziałem agentów

## Metodyka

- Warsztat, nie wykład. Około 70% czasu to praca uczestników przy własnych komputerach, na wspólnym projekcie prowadzonym przez cały kurs.

- Jeden projekt, oba narzędzia. Uczestnicy pracują na gotowej aplikacji Java. Analizują repozytorium, konfigurują kontekst dla agentów, implementują zmianę, naprawiają błąd, refaktoryzują kod, tworzą testy i przeprowadzają code review. W kluczowych momentach to samo zadanie jest realizowane raz w Codex, raz w Copilot CLI, z porównaniem przebiegu i wyniku.

- Ankieta przed szkoleniem. Przed startem zbieram informacje o wersji Javy, frameworkach, platformie repozytorium (np. GitHub, Bitbucket lub GitLab), systemie zadań (np. Jira), CI/CD i obecnym sposobie pracy z agentami. Na tej podstawie ustalam ostateczny wariant projektu i dobieram integracje.

- Materiały do zabrania. Uczestnicy wychodzą z gotowymi plikami konfiguracyjnymi (AGENTS.md, definicje sub-agentów i custom agents, skills oraz przykładowe workflow), które można przenieść do repozytoriów firmowych.

- Bezpieczeństwo od pierwszego dnia. Tryby uprawnień, sandbox i kontrola nad tym, co agent może wykonać – omawiane przy każdym narzędziu, a nie jako osobny wykład na końcu.

## Oprogramowanie i dostęp

- OpenAI Codex – CLI, Desktop App i tryb chmurowy; wymagany plan ChatGPT albo klucz API

- GitHub Copilot CLI – instalacja przez npm (Node.js 22+), Homebrew lub WinGet; wymagany aktywny plan Copilot (Pro, Pro+, Business, Enterprise)

- w planach Business/Enterprise administrator musi włączyć politykę Copilot CLI dla organizacji – warto zweryfikować to z tygodniowym wyprzedzeniem

- dostęp do używanej przez klienta platformy repozytorium i pull requestów; przykłady mogą zostać dopasowane do GitHub, Bitbucket lub GitLab

- Java, Maven lub Gradle, Git, IDE; Windows, macOS lub Linux (na Windows dodatkowo PowerShell 6+)

- licencje i dostępy po stronie uczestników – ich weryfikacja jest częścią materiałów przygotowawczych wysyłanych przed szkoleniem

## Co osiągniesz

**Po szkoleniu uczestnicy będą potrafili:**

- skonfigurować agenta na poziomie projektu tak, żeby respektował konwencje i architekturę repozytorium

- napisać AGENTS.md, który działa jednocześnie dla Codex i Copilot CLI, oraz rozszerzyć go o instrukcje specyficzne dla jednego narzędzia

- zbudować zespół sub-agentów (programista Java, analityk repozytorium, QA/reviewer) i delegować im zadania zamiast pisać kolejne prompty

- dobierać integracje CLI i MCP do realnej potrzeby, np. dokumentacji, repozytorium lub systemu zadań, z preferencją dla CLI tam, gdzie jest ono dostępne

- prowadzić kilku agentów pracujących równolegle bez konfliktów w repozytorium

- tworzyć własne custom agents i skills w Copilot CLI oraz dystrybuować je w zespole

- delegować zadania do agentów chmurowych i odbierać wynik jako pull request

- przeprowadzić z agentem analizę istniejącej aplikacji Java, bezpiecznie wdrożyć zmianę, poprawić błąd lub wykonać refaktoryzację oraz zweryfikować rezultat testami

- przygotować pull request i przeprowadzić code review z pomocą agenta, z uwzględnieniem platformy używanej przez klienta

- świadomie wybierać narzędzie do zadania – wiedzieć, kiedy sięgnąć po Codex, a kiedy po Copilot CLI

## Co wyróżnia to szkolenie

- Pełny program kursu, nie jego skrót. Dni 1–3 obejmują cały zakres szkolenia otwartego; rozszerzenie o Copilot CLI nic z niego nie usuwa.

- Realny projekt, nie zestaw demek. Uczestnicy pracują na przygotowanej aplikacji Java i przechodzą pełny cykl zmiany w istniejącym systemie: analiza repozytorium, plan, implementacja, poprawa błędu lub refaktoryzacja, testy, code review i pull request.

- Context Engineering. Uczestnicy uczą się projektować kontekst i konfigurację, a nie zapamiętywać sztuczki promptowe, które dezaktualizują się z każdą wersją modelu.

- Dwa narzędzia, jeden standard zespołowy. Kurs kończy się konfiguracją działającą w obu narzędziach i mapą doboru narzędzia do typu zadania.

- Aktualność. Oba narzędzia zmieniają się co kilka tygodni – program jest weryfikowany względem dokumentacji przed każdą edycją.

## Program szkolenia

### Dzień 1 - Fundamenty i analiza projektu Java

#### 1.1 Wprowadzenie i konfiguracja

- Omówienie doświadczeń uczestników, poznajmy się

- AI w programowaniu w 2026: agenci, nie asystenci

- Krótki przegląd trendów i case studies wykorzystania agentów AI

- Korzyści vs ryzyka (halucynacje, nadmierne poleganie, context rot, koszty)

- Weryfikacja środowiska: Codex CLI, Desktop app, IDE, Node.js, Git

- Weryfikacja środowiska GitHub Copilot CLI: instalacja, logowanie, wymagany plan i polityka organizacji

- Pierwsze uruchomienie Codex – interaktywny test

- Ćwiczenie: ten sam prompt uruchomiony w Codex i Copilot CLI, porównanie przebiegu i wyniku

#### 1.2 Codex - tryby pracy i kluczowe funkcje

- Codex CLI: tryb interaktywny vs jednorazowe polecenia

- Codex Desktop App: zarządzanie wieloma sesjami w GUI

- Codex w chmurze: remote environments, konfiguracja

- Porównanie trybów: kiedy CLI, kiedy Desktop, kiedy Cloud

- Kluczowe komendy i opcje konfiguracyjne

- Wybór modelu: jakość vs szybkość vs koszt; modele OpenAI oraz praca z modelami lokalnymi i alternatywnymi

- Zarządzanie kontekstem: okno kontekstowe, kompresja, context rot

- Uprawnienia i tryby bezpieczeństwa, sandbox, izolacja

- Copilot CLI obok Codexa: wybór modelu i auto model selection, mechanizm zgód na narzędzia, sandbox lokalny i chmurowy (oba w public preview) oraz delegowanie zadań do Copilot cloud agent

#### 1.3 Context Engineering i konfiguracja agenta

- Od Prompt Engineering do Context Engineering

- AGENTS.md – instrukcje dla agenta na poziomie projektu i globalnym

- Konfiguracja zachowania agenta: zasady, ograniczenia, preferencje

- Struktura kontekstu: system prompt, pliki konfiguracyjne, pamięć

- Nested AGENTS.md: różne zasady dla różnych folderów

- AGENTS.md w Copilot CLI: ten sam plik, to samo zachowanie oraz rozszerzenia po stronie GitHuba (.github/copilot-instructions.md, instrukcje ścieżkowe z applyTo)

- Praktyka: tworzenie konfiguracji agenta dla naszego projektu i sprawdzenie jej w obu narzędziach

- Best practices: co wpisywać, czego unikać, jak iterować

#### 1.4 Projekt warsztatowy Java - analiza istniejącego repozytorium

- Omówienie przygotowanej aplikacji Java i jej kontekstu biznesowego

- Analiza struktury repozytorium, zależności, architektury, konfiguracji oraz sposobu uruchamiania testów

- Przygotowanie krótkiego PRD dla planowanej zmiany i ADR dla decyzji technicznej

- Identyfikacja ryzyk, długu technicznego, braków w dokumentacji i miejsc wymagających testów

- Ćwiczenie: Codex i Copilot CLI analizują to samo repozytorium, przygotowują plan zmiany i wskazują informacje, których nie powinny zgadywać

##### Proponowane warianty projektu do wyboru po ankiecie

1. **Aplikacja Spring Boot rozwijana jak istniejący system** - REST API, warstwa usług, baza danych, testy oraz typowe zadanie biznesowe obejmujące analizę, implementację zmiany, naprawę błędu i refaktoryzację.
2. **Spring Boot z prostą integracją LLM** - gotowa aplikacja rozszerzana o niewielką funkcję opartą na OpenAI Java SDK, dzięki czemu zespół pracuje w znanym stacku, a przykład pokazuje również nowy, angażujący scenariusz.
3. **Legacy Java: jFTP** - analiza około 14-letniego programu FTP napisanego w starszej wersji Javy, bez testów i dokumentacji; zadaniem agentów jest zrozumienie kodu, przygotowanie dokumentacji, dodanie zabezpieczających testów i bezpieczna modernizacja wybranego fragmentu.

Ostateczny wariant projektu, wersja Javy i poziom trudności zostaną ustalone na podstawie ankiety technicznej przed szkoleniem.

### Dzień 2 - Narzędzia, sub-agenci i implementacja zmiany

#### 2.1 Narzędzia CLI, MCP i integracje - jak dobrać właściwy mechanizm

- Wbudowane możliwości Codex: praca na plikach, shell i wyszukiwanie w sieci

- CLI, MCP i Skills - czym się różnią, kiedy zastosować każdy mechanizm i dlaczego preferujemy CLI tam, gdzie istnieje dobre narzędzie wiersza poleceń

- MCP w niezbędnym zakresie: bez budowania rozbudowanej infrastruktury, jako opcjonalny standard integracji z narzędziami, które nie udostępniają wygodnego CLI

- Aktualna dokumentacja dla Javy i bibliotek bez zgadywania przez model, np. za pomocą Context7 dostępnego jako CLI lub MCP

- Integracje z repozytorium, pull requestami i systemem zadań, np. GitHub, Bitbucket, GitLab lub Jira - zakres dobrany po ankiecie

- Bezpieczeństwo integracji: zakres uprawnień, zgody, dane firmowe i kontrola nad działaniami agenta

- Konfiguracja integracji w Codex i Copilot CLI oraz porównanie natywnych możliwości obu narzędzi

- Ćwiczenie: agent pobiera aktualną dokumentację potrzebną do zadania w aplikacji Java oraz odczytuje kontekst zadania i pull requesta z narzędzi używanych przez zespół

#### 2.2 Skills - dawanie umiejętności i workflow

- Skills – reużywalne umiejętności dla agentów

- Instalowanie istniejących skills jako bazowych template do dalszego rozwoju

- Tworzenie własnych skills w oparciu o historię sesji i nasz workflow

- Dodawanie skryptów i narzędzi (np. bash, CLI, MCP) w ramach skills

- Custom slash commands

- Skills w Copilot CLI: te same pliki SKILL.md, katalogi projektowe i osobiste, wywołanie z poziomu sesji

#### 2.3 Sub-agenci - delegowanie i bezpośrednia komunikacja

- Architektura sub-agentów w Codex

- Inspekcja i bezpośrednia praca z wątkami sub-agentów w Codex

- Konfiguracja sub-agentów w projekcie

- Praktyka: definiowanie specjalistów dla naszego projektu

- java-developer - implementacja w Javie i Spring Boot

- repository-analyst - analiza architektury, zależności i długu technicznego

- qa-reviewer - testy, jakość i code review

- Delegowanie pierwszych zadań do sub-agentów

- Monitorowanie i feedback: jak kontrolować jakość pracy sub-agentów

- Odpowiednik po stronie GitHuba: custom agents w Copilot CLI – zapowiedź dnia 4

#### 2.4 Implementacja zmiany w aplikacji Java z sub-agentami

- TDD z agentem: Red - Green - Refactor

- Agent pisze testy PRZED kodem produkcyjnym

- Implementacja zadania biznesowego w istniejącej aplikacji Java

- Naprawa wskazanego błędu i refaktoryzacja wybranego fragmentu kodu

- Aktualizacja dokumentacji i decyzji architektonicznych

- Sub-agent java-developer implementuje zmianę

- Sub-agent repository-analyst sprawdza zgodność z architekturą i wpływ zmiany na istniejący system

- Sub-agent qa-reviewer przygotowuje testy i wykonuje code review wygenerowanego kodu

- Git: granularne commity po każdej zielonej fazie

### Dzień 3 - Zespoły agentów, jakość i pull request

#### 3.1 Agent Teams - praca równoległa

- Od sub-agentów do zespołów: orkiestracja wielu agentów

- Równoległa praca agentów: izolacja środowisk, zarządzanie konfliktami

- Task Plan Matrix: planowanie zależności, fazy, briefing agentów

- Praktyka: rozdzielenie zadań między agentów pracujących równolegle

- Agent 1: implementacja zmiany w aplikacji Java

- Agent 2: poprawa błędu lub refaktoryzacja niezależnego fragmentu

- Agent 3: testy, analiza regresji i code review

- Codex Cloud: agenci pracujący w remote environments

- Merge i rozwiązywanie konfliktów

#### 3.2 Testowanie i pętla walidacji z AI

- Pętla walidacji agenta: plan - test nie przechodzi - implementacja - test przechodzi - refaktoryzacja - ponowna weryfikacja

- TDD w praktyce: testy jednostkowe i integracyjne dla aplikacji Java

- Playwright jako opcjonalne narzędzie agenta do automatycznej weryfikacji aplikacji z interfejsem webowym, również dla programistów backend - bez osobnego modułu testów manualnych i bez założenia udziału testerów

- Dlaczego agent potrzebuje pętli QA: sam fakt wygenerowania lub skompilowania kodu nie potwierdza, że cały scenariusz użytkownika działa poprawnie

- Code review z agentem: security, jakość, best practices

- Code review po stronie Copilot CLI: wbudowany agent recenzenta i przegląd pull requesta

- Ograniczenia i konieczność ludzkiego przeglądu

#### 3.3 Codex w chmurze, CI/CD i praca z pull requestem

- Codex Cloud environments: konfiguracja, sekrety, networking, GitHub

- Headless mode: Codex bez interakcji w pipeline

- Podstawy CI/CD z Codex, dopasowane do platformy klienta

- Przygotowanie pull requesta: opis zmiany, zakres testów, ryzyka i wskazówki dla recenzenta

- Weryfikacja pipeline'u i reakcja agenta na nieudane testy lub uwagi z code review

- Koszty i optymalizacja: tokeny, modele, cache

#### 3.4 Podsumowanie i dalsze kroki

- Demo: przegląd projektów uczestników

- Retrospektywa: co zadziałało, co wymaga poprawy

- Porównanie Codex i GitHub Copilot CLI w kontekście zadań wykonanych w projekcie Java

- Best practices pracy z Codex w zespole

- Zaawansowane tematy na przyszłość, modele lokalne i otwarte

- Zasoby do dalszej nauki i rozwoju

### Dzień 4 - GitHub Copilot CLI i praca z dwoma narzędziami

#### 4.1 Copilot CLI - konfiguracja i tryby pracy

- Instalacja i logowanie: npm, Homebrew, WinGet; plany Copilot i polityka organizacyjna

- Wybór modelu, auto model selection, modele własne (BYOK) i modele lokalne

- Mechanizm zgód na narzędzia, granularne uprawnienia, sandbox lokalny i chmurowy (oba w public preview)

- Sesje: wznawianie, cofanie zmian, kompaktowanie kontekstu w długiej pracy

- Warstwy instrukcji: AGENTS.md, .github/copilot-instructions.md, instrukcje ścieżkowe i osobiste

- Praktyka: podpięcie Copilot CLI do projektu z dni 1–3 i wykonanie zadania na istniejącym kodzie

#### 4.2 Custom agents, skills i pluginy

- Custom agents (*.agent.md): definicja roli, zakres narzędzi, poziom projektu i użytkownika

- Agenci wbudowani: Explore, Task, Code review, Research

- Subagenci z własnym oknem kontekstu; tryb planowania i praca autonomiczna

- Hooki jako bramki jakości: reakcja na zdarzenia sesji i użycie narzędzi

- Pluginy: dystrybucja agentów, skills i konfiguracji MCP w zespole

- Praktyka: przeniesienie specjalistów java-developer, repository-analyst i qa-reviewer z dnia 2 na custom agents Copilot CLI

#### 4.3 Integracja z repozytorium i procesem pull request

- Praca z issues, zadaniami, pull requestami i workflow z poziomu terminala; przykłady dla GitHub lub odpowiedników używanych przez klienta

- Delegowanie zadania do Copilot coding agent w chmurze i odbiór wyniku jako draft pull requesta, jeśli środowisko klienta udostępnia tę możliwość

- Kiedy oddać zadanie w tło, a kiedy zostać w sesji interaktywnej

- Copilot CLI w automatyzacji: tryb nieinteraktywny, uprawnienia, tokeny i bezpieczne granice

- Praktyka: workflow reagujący na nowego pull requesta oraz zadanie oddane agentowi chmurowemu

#### 4.4 Dwa narzędzia w codziennej pracy zespołu

- Codex czy Copilot CLI – mapa typów zadań i rekomendacje doboru narzędzia

- Wspólna konfiguracja repozytorium działająca w obu narzędziach, bez duplikowania zasad

- Koszty i limity: rozliczenia po stronie GitHuba i OpenAI, świadome zarządzanie zużyciem

- Standard zespołowy: co ustandaryzować, jak dystrybuować konfigurację, od czego zacząć wdrożenie

- Praktyka: przygotowanie konfiguracji dla repozytorium uczestnika, retrospektywa i omówienie na forum grupy

## Informacje organizacyjne

| | |
|---|---|
| **Format:** | online, na żywo |
| **Czas trwania:** | 4 dni, w godzinach 9:00-16:00 |
| **Liczba uczestników:** | 2 grupy po około 11 osób |
| **Wstępnie proponowane terminy:** | grupa 1: 5-8 października 2026; grupa 2: 13-16 października 2026 |
| **Personalizacja:** | ankieta techniczna przed szkoleniem i wybór wariantu projektu Java |
| **Materiały:** | repozytorium warsztatowe, pliki konfiguracyjne agentów, przykładowe workflow i materiały poszkoleniowe |

## Prowadzący szkolenie

### Łukasz Matuszewski - full-stack developer i trener AI

**Programuje komercyjnie od 2003 roku, szkoli od 2010. Na co dzień buduje aplikacje AI-first i pracuje z agentami kodującymi w projektach produkcyjnych, a nie tylko w materiałach szkoleniowych.**

- Specjalizacja: tworzenie aplikacji i integracji z modelami językowymi oraz praktyczne wdrażanie agentów AI w cyklu wytwarzania oprogramowania

- Doświadczenie zdobyte w międzynarodowych korporacjach i w innowacyjnych startupach – od zespołów rozproszonych w USA po produkty budowane od zera

- Prowadzi szkolenia z Codex i GitHub Copilot CLI dla zespołów programistycznych, w tym grup pracujących w Javie, w języku polskim i angielskim

| **Następne kroki** |
| :---- |
| Przed szkoleniem przeprowadzimy krótką ankietę techniczną dotyczącą wersji Javy, frameworków, repozytorium, CI/CD i narzędzi zespołu. Na jej podstawie wybierzemy wariant projektu warsztatowego i dopracujemy ćwiczenia, zachowując uzgodniony zakres programu. |
