# UPDATE: Angular AI chat demo and jFTP implementation

This example Angular chat app lives in the [Vercel AI SDK repository](https://github.com/vercel/ai/tree/e0fdae62c4ecb980c40e17d3fe87bacce7d14c1f/examples/angular). The demo setup was created 100% in ChatGPT Voice mode on 8 October 2026, by cloning, configuring, building and running the existing upstream example. The original application source was written by the Vercel AI SDK contributors.

We created the branch [`angular-ai-chat-voice-mode-demo`](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/tree/angular-ai-chat-voice-mode-demo) for this demo. See [the demo instructions and saved model configuration patch](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/blob/angular-ai-chat-voice-mode-demo/course-materials/angular-ai-chat/README.md) to reproduce it. The chat uses Ling 3.1 Flash (Free) through Vercel AI Gateway, with the API key kept on the Express server.

The jFTP implementation code is available in [Lucas Matuszewski's fork, on the `main` branch](https://github.com/LucasMatuszewski/jftp-modernization/tree/main). It includes RepoMap, Repomix, context7-local with local RAG, and basic application updates to run jFTP on Windows 11.

# Codex i GitHub Copilot CLI - warsztat Java (Sages / Sygnity)

5-8 października 2026, 09:00-17:00 czasu polskiego, Zoom, własne komputery. Pracujemy przede wszystkim w OpenAI Codex, a wyniki porównujemy z GitHub Copilot CLI. Pierwszego dnia poznajemy [jFTP autorstwa Sai Pullabhotli](https://github.com/sai-pullabhotla/jftp), istniejący klient FTP/FTPS z interfejsem Swing. Na kolejnych dniach dokumentujemy ten sam kod, naprawiamy start i rozwijamy jedną uzgodnioną zmianę.

- [Strona szkolenia i materiały](https://devpowers.com/szkolenia/sages/sygnity-05-10/)
- [Pełna agenda](AGENDA.md) - zachowany program źródłowy; aktualne godziny to 09:00-17:00.
- [Ćwiczenie jFTP](course-materials/java/README.md)
- [Slajdy i biblioteka promptów](course-materials/slides/README.md)

## Dwa repozytoria

To repozytorium zawiera materiały kursowe i instrukcje. Kod aplikacji pobierz osobno, do sąsiedniego katalogu:

```bash
git clone https://github.com/sai-pullabhotla/jftp.git
```

Pracuj w katalogu `jftp`, zgodnie z jego własnymi plikami i ustaleniami zespołu. Jeśli potrzebujesz odtwarzalnego punktu startowego, użyj rewizji `14e62ceba4e371c2a0b955604b10f065f46f4f7d`. Własny fork przyda się do wysyłania gałęzi i PR, ale nie jest warunkiem rozpoczęcia pracy lokalnej. PRD funkcji i ADR-y tworzycie w repozytorium aplikacji podczas warsztatu, po ustaleniu zakresu zmiany.

Nie zakładaj, że projekt od razu się zbuduje lub uruchomi. Najpierw zbierz dowody o kodzie, zależnościach i środowisku; potem zaplanuj najmniejsze potrzebne kroki. Kompilacja, testy i uruchomienie okna Swing są osobnymi wynikami, które trzeba udokumentować. Do prób używaj wyłącznie lokalnych danych syntetycznych, bez połączenia z cudzym serwerem FTP i bez prawdziwych danych uwierzytelniających.

## Biblioteka dodatkowa

`course-materials/` zawiera slajdy, prompty, konfiguracje narzędzi i archiwalne przykłady. Są pomocami do wyboru, nie wymaganiami aplikacji ani konfiguracją do automatycznego włączenia. Przykładowych PRD i ADR nie przenoś bez sprawdzenia do jFTP. Przed oddaniem pracy przejrzyj diff, wyniki poleceń i nierozstrzygnięte pytania.
