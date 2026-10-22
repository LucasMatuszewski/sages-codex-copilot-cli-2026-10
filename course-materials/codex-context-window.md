# Większe okno kontekstu w projekcie Codex

Ten projekt ma przykładową, lokalną konfigurację większego okna kontekstu i późniejszej automatycznej kompakcji. Ustawienia znajdują się w [`../.codex/config.toml`](../.codex/config.toml); dotyczą tego zaufanego projektu, a nie całego konta.

## Dwa różne ustawienia

`model_context_window` określa liczbę tokenów, które Codex ma udostępnić aktywnemu modelowi. `model_auto_compact_token_limit` mówi, przy jakim progu Codex ma rozpocząć kompakcję historii. Wartość okna nie podnosi limitu obsługiwanego przez wybrany model lub usługę. Kompakcja pomaga zmieścić dłuższą pracę, ale nie zastępuje trwałej dokumentacji ani dobrego briefu.

Większy kontekst może zwiększyć koszt i opóźnienie pracy. Używaj go, gdy zadanie naprawdę potrzebuje większej ilości materiału. Współpracując z mniejszymi agentami, przekazuj im tylko istotne pliki i zwięzły zakres.

## Ustawienia tego przykładu

```toml
model_context_window = 800000
model_auto_compact_token_limit = 700000
model_auto_compact_token_limit_scope = "total"
```

Próg `700000` jest liczony w całym aktywnym kontekście, łącznie z przeniesionym prefiksem. Nie wybiera modelu ani dostawcy; aktywny model nadal wynika z ustawień użytkownika, profilu lub jawnego wyboru.

Stan lokalnego katalogu Codex sprawdzony **22 października 2026 r.** dla Codex CLI `0.163.0` wskazywał maksymalną wartość `872000` dla modeli Sol i Luna. Ich wartości katalogowe okna wynosiły odpowiednio `500000` i `272000`, a efektywny procent kontekstu `95`. Przy projekcie ustawionym na `800000` próg `700000` pozostawia `60000` tokenów do efektywnego progu `760000`. To migawka konkretnego katalogu, a nie gwarancja dla innych modeli, kont ani przyszłych wersji.

Przed użyciem sprawdź bieżący katalog dla wybranego modelu. Jeśli nie obsługuje zadanych wartości, zmniejsz je do obsługiwanego zakresu albo usuń te ustawienia, by wrócić do wartości modelu. Gdy próg kompakcji pozostaje nieustawiony, Codex używa wartości domyślnej modelu; nie zakładaj stałego progu liczbowego.

## Zakres projektu i przeniesienie

Codex wczytuje projektowy `.codex/config.toml` tylko dla zaufanego projektu. Nie ufaj repozytoriom, których pochodzenia nie znasz. Szczegóły zakresu i pierwszeństwa opisuje [oficjalny przewodnik konfiguracji Codex](https://learn.chatgpt.com/docs/config-file/config-basic).

Planowany katalog projektu w WSL to `/home/lucas/DEV/COURSES/Sages/sages-codex-copilot-cli-2026-10-cra-poc`. Po przeniesieniu otwórz projekt z nowej lokalizacji i rozpocznij nowy czat lub sesję, aby Codex odczytał konfigurację z aktualnego katalogu. Nie łącz plików globalnej konfiguracji, profili ani stanu logowania podczas przenoszenia.

## Cofnięcie przykładu

Usuń z projektowego pliku wyłącznie trzy powyższe aktywne klucze, jeśli chcesz wrócić do automatycznych wartości modelu. Zostaw pozostałą zawartość istniejącego pliku bez zmian.

## Dokumentacja

- [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference) — znaczenie `model_context_window`, progu kompakcji i jego zakresu.
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic) — projektowe pliki konfiguracji, zaufanie projektu i kolejność ustawień.
- [Sample Configuration](https://learn.chatgpt.com/docs/config-file/config-sample) — przykładowy plik; pokazane tam wartości są przykładami, nie uniwersalnymi domyślnymi ustawieniami.
