# Teppichwerkstatt Zürich

Statische Website, drei Seiten, kein Build-Schritt. Ordner auf einen beliebigen
Webserver kopieren, fertig. Zum lokalen Ansehen genügt:

```
python3 -m http.server 8080
```

und dann `http://localhost:8080` im Browser öffnen. Ein reiner Doppelklick auf
`index.html` funktioniert auch, nur die Schriften laden dann je nach Browser nicht.

---

## Aufbau

```
index.html          Startseite mit neun Ankerabschnitten
impressum.html      Anbieterkennzeichnung
datenschutz.html    Datenschutzerklärung
assets/
  css/style.css     Gesamtes Design, Farben und Schriften ganz oben als Variablen
  js/main.js        Scroll-Mechanik und Interaktionen
  img/              Logo, Filmkorn, Poster, Vorher/Nachher
  video/            hero.mp4 und hero.webm
```

## Das Hero-Video

`assets/video/hero.mp4` (2,7 MB) und `hero.webm` (2,3 MB) sind eingebaut und
laufen. Das gelieferte Material war fünf Sekunden lang und endete an einer
anderen Stelle als es begann — eine harte Schleife hätte sichtbar gesprungen.
Deshalb läuft es jetzt vorwärts und rückwärts, was zehn Sekunden ohne Schnitt
ergibt. Die Kamerafahrt ist langsam genug, dass der Rücklauf nicht auffällt.

Tonspur ist entfernt, Poster stammt aus Sekunde 1,2 des Videos.

Ersetzen Sie das Material so:

```
ffmpeg -i neu.mov -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
  -map "[v]" -an -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p \
  -movflags +faststart assets/video/hero.mp4
ffmpeg -i assets/video/hero.mp4 -ss 1.2 -frames:v 1 -q:v 4 assets/img/hero-poster.jpg
```

Lassen Sie den Reverse-Filter weg, wenn Ihr neues Material bereits nahtlos
schliesst. Fällt die Datei aus, springt automatisch das Poster ein.

## Der Übergang vom Hero zum nächsten Abschnitt

Die Bühne ist 280 vh hoch, der Inhalt bleibt darin oben angeheftet. Über diesen
Weg laufen vier Bewegungen ineinander: der Hero-Text zieht sich zurück, der Film
skaliert auf 120 Prozent und verliert Helligkeit, darunter steigt die
Elfenbein-Tafel hervor, und zuletzt kommt deren Schrift.

Die Zeitpunkte stehen in `assets/js/main.js` in `stageJob`. Die Zahlenpaare sind
Abschnitte des Scrollwegs von 0 bis 1:

```js
const fade = ease(span(p, 0.20, 0.64));   // ab 20 % blendet der Film aus
const c    = ease(span(p, 0.16, 0.62));   // ab 16 % kommt die Tafel
const d    = ease(span(p, 0.48, 0.84));   // ab 48 % die Schrift darauf
```

Soll der Übergang länger dauern, erhöhen Sie `.stage { height }` in der CSS.
Soll er früher greifen, verschieben Sie die Zahlenpaare nach vorn.

## Was Sie vor dem Livegang ersetzen müssen

Alle Platzhalter sind bewusst mit Nullen geschrieben, damit sie auffallen:

- Adresse `Seefeldstrasse 12, 8008 Zürich`
- Telefon `+41 44 000 00 00`
- E-Mail `atelier@teppichwerkstatt.ch`
- UID und MWST-Nummer `CHE-000.000.000` (in `impressum.html`)
- Handelsregistereintrag und vertretungsberechtigte Person
- Hostingdienstleister in `datenschutz.html`, Ziffer 7

Die Adresse steht an vier Stellen in `index.html`: Kontaktblock, Fusszeile,
Überblendmenü und im JSON-LD ganz unten. Suchen und ersetzen lohnt sich.

Preise, Fristen und Leistungsumfang sind Vorschläge auf Basis eines gehobenen
Zürcher Preisniveaus. Bitte gegen die eigene Kalkulation prüfen.

## Das Formular

Im Auslieferungszustand sendet das Abholformular nichts an einen Server. Es
öffnet das Mailprogramm mit einer vorbereiteten Nachricht. Das funktioniert
sofort, ist aber für ein Geschäft dieser Preisklasse auf Dauer zu wenig.

Sobald Sie einen Empfänger haben, tragen Sie ihn im Formular ein:

```html
<form id="abholung" method="post"
      action="https://ihr-endpunkt.example/abholung"
      data-endpoint="1">
```

Ist `data-endpoint` gesetzt, hält sich das Skript heraus und der Browser sendet
ganz normal ab. Denken Sie daran, die Datenschutzerklärung dann um den
Dienstleister zu ergänzen.

## Schriften lokal ausliefern

Aktuell kommen Bodoni Moda und Archivo von Google. Dabei geht die IP-Adresse der
Besucherin an Google — in `datenschutz.html` unter Ziffer 6 offengelegt. Für die
Schweiz ist Selbsthosting der sauberere Weg:

1. Beide Familien von `fonts.google.com` herunterladen, in `assets/fonts/` legen
2. Die drei `<link>`-Zeilen zu Google in allen drei HTML-Dateien entfernen
3. `@font-face`-Regeln oben in `style.css` ergänzen
4. Ziffer 6 aus der Datenschutzerklärung streichen

Damit setzt die Seite keinerlei Verbindungen zu Dritten mehr.

## Das Logo

`assets/img/logo.svg` ist aus der zweiten Vorlage nachgezeichnet — 4 KB bei
99,5 Prozent Deckung. Eingebunden ist es als CSS-Maske, dadurch nimmt es überall
die Textfarbe an: Elfenbein in der Kopfzeile, Schwarz auf der Elfenbeintafel,
Elfenbein in der Fusszeile.

Zum Austauschen genügt es, `logo.svg` zu ersetzen. Die neue Datei braucht ein
`viewBox`-Attribut; bei anderen Proportionen ist `aspect-ratio` unter `.mark`
in `style.css` anzupassen.

Aus derselben Zeichnung entstanden die Symbole:

| Datei | Zweck |
|---|---|
| `favicon.svg` | Browsertab, Elfenbein auf Schwarz |
| `favicon-32.png` | Rückfall für ältere Browser |
| `apple-touch-icon.png` | Startbildschirm auf iOS, 180 px |
| `icon-512.png` | Reserve für ein Web-Manifest |

Neu erzeugen lassen sie sich mit `logo_neu.py`, falls die Marke sich ändert.

## Die Karte im Einsatzgebiet

Die Schweizkarte in `index.html` ist ein eingebettetes SVG: 556 Rasterpunkte
innerhalb der Landesgrenze, 14 Orte, zwei ruhende Zonenringe und drei
Echolot-Ringe, die von Zürich aus nach aussen laufen. Die Rasterpunkte hellen
genau dann auf, wenn ein Ring sie erreicht — dafür sind sie in 16 Laufzeitgruppen
sortiert, deren Verzögerung in `--t` steht.

Die Ringe werden über `transform: scale()` vergrössert statt über den Radius.
Das läuft flüssiger und funktioniert in jedem Browser; `vector-effect:
non-scaling-stroke` hält die Linie dabei gleich dünn.

Die Grenzlinie stammt aus dem Natural-Earth-Datensatz und ist bewusst grob
gehalten. Zonenradien sind 32 und 85 Kilometer, gemessen ab Zürich. Alles
Weitere steuert der Abschnitt `Karte Schweiz` in `style.css`.

Erzeugt wurde die Karte mit `gen_map.py`. Wollen Sie Orte, Zonen oder Radien
ändern, passen Sie dort `CITIES`, `KERN_R` und `WEIT_R` an und ersetzen das SVG
im Abschnitt `#gebiet`.

## Farben ändern

Ganz oben in `style.css`:

```css
--ink:    #0A0A09;   /* Schwarz, leicht warm */
--ivory:  #EFEAE0;   /* Elfenbein */
--flame:  #E4551D;   /* Signalorange */
```

Das Orange ist bewusst sparsam gesetzt: aktiver Menüpunkt, kursive Akzente in
den Überschriften, Schrittnummern im Ablauf, der Hauptknopf und die Striche vor
den Rubriken. Mehr davon nimmt der Farbe die Wirkung.

## Barrierefreiheit und Verhalten

- Ankermenü hebt den aktuellen Abschnitt hervor, Tastaturfokus ist überall sichtbar
- Der Vorher/Nachher-Regler lässt sich ziehen und mit den Pfeiltasten bedienen
- `prefers-reduced-motion` schaltet sämtliche Scrollbewegung ab und stapelt die
  Bühne stattdessen
- Ohne JavaScript bleibt der gesamte Inhalt lesbar
- Getestet gegen aktuelle Chrome-, Safari- und Firefox-Versionen; `backdrop-filter`
  und `:has()` sind die neuesten verwendeten Funktionen

## Herkunft der Bilder

`hero-poster.jpg` stammt aus Ihrem Video und ist echt.

`teppich-vorher.jpg`, `teppich-nachher.jpg` und `grain.png` sind weiterhin
rechnerisch erzeugte Platzhalter. Sie zeigen, wie die Abschnitte wirken, sind
aber kein Ersatz für Aufnahmen aus der eigenen Werkstatt. Besonders der
Vorher/Nachher-Vergleich lebt von echten Fotos desselben Stücks aus identischer
Perspektive — Stativ, gleiche Position, gleiches Licht.
