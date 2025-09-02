ARKON Toolkit — 2025-09-02 21:21

Zawartość:
- index.html — główny kalkulator zestawów PV (panele, autodobór mocy, falownik/magazyn, dodatki, VAT, prowizja, wydruk).
  * Katalog (panele/inwertery/magazyny) edytujesz w sekcji 3 lub importujesz z JSON-a
    (pola: panels[], inverters[], batteries[] z kluczami: brand, model, watt/ac_kw/kwh, price).
  * Ustawienia (⚙️): PIN (opcjonalny), opłata firmy (ukryta), cena optymalizatora.
  * Pakiety akcesoriów: licznik 3F, zabezpieczenia AC/DC (symbolicznie), optymalizatory=liczba paneli.
  * Magazyn ciepła: 3000 zł/szt., dowolna ilość.
  * Podłoże: dach płaski +500, grunt +1500 (zmienisz w kodzie, jeśli chcesz +500).

- dotacje.html — prosty kalkulator dotacji „Mój Prąd”.
  * Edytowalne limity: PV+mag. ciepła, PV+mag. energii, sam mag. energii.
  * Limit refundacji 50% (domyślnie; można zmienić na 40%/30%).
  * Pokazuje brutto przed i po dotacji.

Instrukcja:
1) Otwórz index.html w przeglądarce.
2) Kliknij „Załaduj przykładowe”, jeśli selektory są puste.
3) Wypełnij formularz i kliknij „Przelicz”.
4) „Drukuj / PDF” tworzy schludny wydruk dla klienta.
5) Dotacje policzysz w dotacje.html.
