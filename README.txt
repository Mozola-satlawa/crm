ARKON — pakiet stron (komponenty + kalkulator)
===============================================
Data wygenerowania: 2025-09-02

Co jest w ZIP:
- komponenty-fotowoltaika.html — pełny kalkulator/oferta (panele, falownik, magazyn, dodatki, VAT, prowizja, ukryta opłata firmy).
- komponenty-panele.html       — katalog paneli i zestawów panelowych (edycja w tabeli).
- input/ (jeśli istnieją)      — Twoje pliki referencyjne wrzucone do tej rozmowy.

Jak używać:
1) Otwórz komponenty-fotowoltaika.html w przeglądarce.
2) Kliknij „Import katalogu (JSON)” i wskaż plik JSON w formacie:
{
  "panels":[{"brand":"JINKO","model":"...","watt":445,"price":240}],
  "inverters":[{"brand":"DEYE","model":"...","ac_kw":8,"price":5200}],
  "batteries":[{"brand":"HUAWEI","model":"LUNA2000-5","kwh":5,"price":11500}]
}
3) Jeśli nie masz JSON — użyj „Załaduj przykładowe”, a potem edytuj katalog w tabelach i „Zapisz katalog”.

Uwagi:
- Ceny jednostkowe są wykorzystywane tylko do obliczeń; klient widzi jedynie pozycje i sumy.
- Ukryta opłata firmy (domyślnie 8000 zł) i cena optymalizatora są w „Ustawieniach” (ikona ⚙️).
- VAT liczony automatycznie (8%/23%) wg typu inwestora i powierzchni (możesz wymusić w selektorze VAT).
