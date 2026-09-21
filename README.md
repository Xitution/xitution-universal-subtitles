# Xitution Universal Subtitles V2

V2 setzt den gewünschten Untertitel-Look direkt als universellen Video-Layer um.

## Design

- großer breiter halbtransparenter schwarzer Balken
- stark abgerundete Ecken
- leichter Blur hinter dem Balken
- sehr große fette weiße Schrift
- Text exakt zentriert
- automatische Zeilenumbrüche
- responsive für Smartphone, Tablet und Desktop
- standardmäßig im unteren Videobereich
- optional Position und Schriftgröße über das kleine Menü veränderbar

## Bedienung

Oben rechts im Video:
- `CC`: Untertitel an/aus
- `•••`: Sprache, Schriftgröße, Position

Die Steuerelemente sind bewusst klein. Der Untertitel selbst ist optisch das Hauptelement.

## GoHighLevel

Siehe `GHL-EMBED.html`.

Minimal:

```html
<script
  src="https://DEIN-SERVER/captions.js"
  data-api-base="https://DEIN-SERVER"
  data-default-lang="de"
  data-auto-open="true">
</script>
```

## Was automatisch passiert

1. Script erkennt jedes HTML5-Video auf der Seite.
2. Das Backend transkribiert das Video einmal.
3. Zeitcodes werden gespeichert.
4. Untertitel erscheinen synchron zum Video.
5. Wird eine andere Sprache gewählt, wird die Textspur übersetzt und gecached.
6. Beim nächsten Abruf muss sie nicht neu erzeugt werden.

## Server

Der Server aus V1 ist enthalten. Für Produktion:
- `OPENAI_API_KEY` serverseitig setzen
- `ALLOWED_ORIGINS` auf die Xitution-Domains begrenzen
- optional `ALLOWED_MEDIA_HOSTS` auf die eigenen Video-CDNs begrenzen
- `npm install`
- `npm start`

## Wichtige technische Grenze

Normale HTML5-Videos lassen sich direkt universal überlagern.

Liegt der komplette Player in einem fremden Cross-Origin-iFrame, etwa bei manchen YouTube-, Vimeo-, Wistia- oder Plattform-Embeds, kann das Seitenscript nicht direkt auf den Player zugreifen. Dann wird ein Player-Adapter benötigt. Das Design und die Untertitel-Engine bleiben dabei identisch; nur die Zeitsteuerung des jeweiligen Players wird angebunden.
