# Crime Scripts

A web application to create crime scripts.

## Installation

The application is a mono-repository, developed in TypeScript. It typically consists of the following packages:

## Development

```bash
pnpm i
npm start
```


## TODO

- [x] Create project scaffold: Single Page Application with JSON in- and output
- [x] Create editor for crime scripts: scripts, acts, phases, activities, cast, attributes
- [x] Add option to add images
- [x] When clicking on a search result, navigate to the exact location (add act, phase)
- [x] Add option to specify and view literature
- [x] Allow the user to select multiple acts in each step
- [x] Add sidenav menu
- [ ] Search should preferably also select the act variant
- [x] Zip the model file
- [ ] Use the crime script image, e.g. next to the description
- [x] Add measures to counteract the activity or condition: use Situational Crime Prevention (SCP) to structure the measures.
- [ ] Add option to use it with a case
- [x] Translate to Dutch
- [ ] Export to Word per script
- [ ] Export to Word all scripts

## LLM support to label barriers

```txt
I have a JSON array of barriers. I also have a JSON array of situational crime prevention techniques. Augment the barriers array with one situational crime prevention technique that aligns best with the barrier. Return the new barriers array with the new property `measureId` that is set to the `id` of the most appropriate technique.

SITUATIONAL CRIME PREVENTION TECHNIQUES:
new Map([
    [
        "0_0",
        {
            "id": "0_0",
            "label": "Overig (in \"Overig\")",
            "group": "Overig",
            "icon": "more_horiz"
        }
    ],
    [
        "1_1",
        {
            "id": "1_1",
            "label": "Doelversteviging (in \"Verhoog de inspanning\")",
            "group": "Verhoog de inspanning"
        }
    ],
    [
        "1_2",
        {
            "id": "1_2",
            "label": "Controleer toegang tot faciliteiten (in \"Verhoog de inspanning\")",
            "group": "Verhoog de inspanning"
        }
    ],
    [
        "1_3",
        {
            "id": "1_3",
            "label": "Controleer uitgangen (in \"Verhoog de inspanning\")",
            "group": "Verhoog de inspanning"
        }
    ],
    [
        "1_4",
        {
            "id": "1_4",
            "label": "Leid overtreders af (in \"Verhoog de inspanning\")",
            "group": "Verhoog de inspanning"
        }
    ],
    [
        "1_5",
        {
            "id": "1_5",
            "label": "Beheers gereedschappen/wapens (in \"Verhoog de inspanning\")",
            "group": "Verhoog de inspanning"
        }
    ],
    [
        "2_1",
        {
            "id": "2_1",
            "label": "Breid toezicht uit (in \"Verhoog de risico's\")",
            "group": "Verhoog de risico's"
        }
    ],
    [
        "2_2",
        {
            "id": "2_2",
            "label": "Ondersteun natuurlijk toezicht (in \"Verhoog de risico's\")",
            "group": "Verhoog de risico's"
        }
    ],
    [
        "2_3",
        {
            "id": "2_3",
            "label": "Verminder anonimiteit (in \"Verhoog de risico's\")",
            "group": "Verhoog de risico's"
        }
    ],
    [
        "2_4",
        {
            "id": "2_4",
            "label": "Gebruik plaatsmanagers (in \"Verhoog de risico's\")",
            "group": "Verhoog de risico's"
        }
    ],
    [
        "2_5",
        {
            "id": "2_5",
            "label": "Versterk formeel toezicht (in \"Verhoog de risico's\")",
            "group": "Verhoog de risico's"
        }
    ],
    [
        "3_1",
        {
            "id": "3_1",
            "label": "Verberg doelen (in \"Verminder de beloningen\")",
            "group": "Verminder de beloningen"
        }
    ],
    [
        "3_2",
        {
            "id": "3_2",
            "label": "Verwijder doelen (in \"Verminder de beloningen\")",
            "group": "Verminder de beloningen"
        }
    ],
    [
        "3_3",
        {
            "id": "3_3",
            "label": "Identificeer eigendom (in \"Verminder de beloningen\")",
            "group": "Verminder de beloningen"
        }
    ],
    [
        "3_4",
        {
            "id": "3_4",
            "label": "Verstoor markten (in \"Verminder de beloningen\")",
            "group": "Verminder de beloningen"
        }
    ],
    [
        "3_5",
        {
            "id": "3_5",
            "label": "Ontzeg voordelen (in \"Verminder de beloningen\")",
            "group": "Verminder de beloningen"
        }
    ],
    [
        "4_1",
        {
            "id": "4_1",
            "label": "Verminder frustraties en stress (in \"Verminder provocaties\")",
            "group": "Verminder provocaties"
        }
    ],
    [
        "4_2",
        {
            "id": "4_2",
            "label": "Vermijd geschillen (in \"Verminder provocaties\")",
            "group": "Verminder provocaties"
        }
    ],
    [
        "4_3",
        {
            "id": "4_3",
            "label": "Verminder verleiding en opwinding (in \"Verminder provocaties\")",
            "group": "Verminder provocaties"
        }
    ],
    [
        "4_4",
        {
            "id": "4_4",
            "label": "Neutraliseer groepsdruk (in \"Verminder provocaties\")",
            "group": "Verminder provocaties"
        }
    ],
    [
        "4_5",
        {
            "id": "4_5",
            "label": "Ontmoedig imitatie (in \"Verminder provocaties\")",
            "group": "Verminder provocaties"
        }
    ],
    [
        "5_1",
        {
            "id": "5_1",
            "label": "Stel regels op (in \"Verwijder excuses\")",
            "group": "Verwijder excuses"
        }
    ],
    [
        "5_2",
        {
            "id": "5_2",
            "label": "Plaats instructies (in \"Verwijder excuses\")",
            "group": "Verwijder excuses"
        }
    ],
    [
        "5_3",
        {
            "id": "5_3",
            "label": "Activeer geweten (in \"Verwijder excuses\")",
            "group": "Verwijder excuses"
        }
    ],
    [
        "5_4",
        {
            "id": "5_4",
            "label": "Help bij naleving (in \"Verwijder excuses\")",
            "group": "Verwijder excuses"
        }
    ],
    [
        "5_5",
        {
            "id": "5_5",
            "label": "Beheers drugs en alcohol (in \"Verwijder excuses\")",
            "group": "Verwijder excuses"
        }
    ]
])

BARRIERS:
[
    {
        "id": "id57b9ec07",
        "label": "Controle- en meldplicht verhuurders, verhuurvergunning en/of huurdercheck"
      },
      {
        "id": "id68c1fd18",
        "label": "Intensiveren van internationale samenwerking tussen banken"
      },
...
]
```
