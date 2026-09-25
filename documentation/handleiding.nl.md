# PAX gebruikershandleiding

Deze handleiding beschrijft de normale gebruikersroute, het bewerken van een
crime script en de LLM-wizard. De beelden zijn gemaakt met openbare
starterinhoud en synthetische testgegevens.

[Bekijk de korte video (WebM, 568 kB)](assets/user-guide/pax-handleiding.webm)

## 1. Werkruimte en scriptmodus

PAX bewaart de werkruimte lokaal in de browser. Kies bij de eerste start de
Nederlandse starterbibliotheek of een lege werkruimte. Gebruik **Scriptmodus**
om te wisselen tussen:

- **Publieke modus**: toont en exporteert alleen publieke scripts.
- **Beperkte modus**: kan ook beperkte scripts tonen. Export en delen vragen
  extra bevestiging; een permanente link is niet beschikbaar als de werkruimte
  beperkte inhoud bevat.

De gekozen modus is geen vervanging voor toegangsbeveiliging. Deel een JSON- of
Word-export alleen via een passend beveiligd kanaal.

![Startscherm met scriptfilters en starterbibliotheek](assets/user-guide/01-home.png)

## 2. Een script bekijken

1. Zoek of filter een script op de startpagina.
2. Open het script door de kaart of **meer**-actie te kiezen.
3. Kies een track als het script meerdere routes bevat.
4. Kies bij een scène een modus operandi om een alternatief procespad te zien.
5. Gebruik de rol-pillen onder activiteiten om activiteiten voor één rol te
   markeren.
6. Klap rollen, attributen, transporten, locaties en bronnen open als die
   details nodig zijn.

![Viewer voor Phishing en betaalfraude](assets/user-guide/02-script-view.png)

## 3. Een script bewerken

Kies **Script bewerken**. De editor bestaat uit een scène-overzicht en het
detail van de geselecteerde scène.

1. Open **Scriptgegevens** om titel, beschrijving, taal, classificatie,
   producten, geografie en referenties te wijzigen.
2. Voeg scènes toe of wijzig de volgorde in het overzicht.
3. Bewerk per scène de modus operandi, beschrijving en locatie.
4. Voeg activiteiten toe en koppel rollen, attributen, transporten,
   indicatoren, maatregelen en andere beschikbare taxonomie.
5. Gebruik de track-editor om per scène de gewenste modus operandi te kiezen.
6. Controleer het resultaat in de viewer. PAX bewaart wijzigingen lokaal.

Gebruik **Meer acties** voor JSON- en Word-export, import en andere
scriptacties. Bewaar vóór ingrijpende wijzigingen een JSON-export als
herstelpunt.

![Crime-scripteditor met scène-overzicht](assets/user-guide/03-script-edit.png)

## 4. Een script voorbereiden met de LLM-wizard

Kies op de startpagina **Genereren met LLM**. PAX gebruikt een handmatige,
provider-neutrale overdracht: de toepassing benadert geen LLM, bewaart geen
API-sleutel, opent geen bron-URL en verstuurt geen werkruimtegegevens.

### Stap 1 — Opdracht

Vul in:

- taal van het script;
- criminaliteitsvorm of domein;
- geografische toepasbaarheid;
- detailniveau;
- optionele bron-URL's, één per regel;
- optionele geplakte brontekst of notities.

URL's worden exact in de prompt opgenomen, maar nooit door PAX geopend of
gedownload. Neem geen geheime of herleidbare gegevens op in een prompt voor een
externe dienst.

![Eerste stap van de LLM-wizard](assets/user-guide/04-llm-brief.png)

### Stap 2 — Prompt kopiëren

Kies **Prompt maken** en controleer de gegenereerde prompt. Kopieer die zelf
naar een LLM naar keuze. De prompt vraagt om defensieve analyse en sluit
uitvoerbare delictinstructies en ontwijkingstactieken uit.

![Gegenereerde prompt in donker thema](assets/user-guide/05-llm-prompt-dark.png)

### Stap 3 — JSON plakken

Kopieer uitsluitend het JSON-antwoord van het LLM terug naar PAX. De wizard
parseert en valideert het antwoord lokaal. Een foutmelding benoemt het veld of
de ontbrekende verwijzing; pas het antwoord buiten PAX aan en probeer opnieuw.

### Stap 4 — Controleren en importeren

Controleer vóór import:

- titel, taal en classificatie;
- scènes, modi operandi en activiteiten;
- rollen, locaties, indicatoren en maatregelen;
- bronnen en brongebruik;
- de afwezigheid van operationele delictinstructies.

De werkruimte verandert pas na de expliciete importbevestiging. Een
geïmporteerd script blijft **AI-gegenereerd** en **Onbeoordeeld** totdat een
mens het inhoudelijk heeft beoordeeld.

## 5. Import, export en herstel

- Exporteer de volledige werkruimte als JSON voor een lokaal herstelpunt.
- Een script-JSON is geschikt voor gerichte review en uitwisseling.
- Een Word-export is een leesrapport en geen volledige vervanging van de
  bewerkbare JSON.
- Controleer altijd bestandsnaam en classificatie voor delen.
- Wis lokale appgegevens alleen nadat een bruikbaar herstelbestand is
  gecontroleerd.
