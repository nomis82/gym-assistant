# Gym Assistant

Gym Assistant är en separat Node.js-baserad Home Assistant-version av SET – Träningslogg.
Träningspass och övningar sparas lokalt i webbläsaren på enheten som öppnar appen.

## Installera som Home Assistant-tillägg

Om GitHub-repot är privat kan Home Assistant inte hämta det utan autentisering. Kopiera
då mappen `addon/gym-assistant` till `/addons/gym-assistant` på Home Assistant och ladda
om tilläggsbutiken för att installera det som ett lokalt tillägg. Om repot är publikt kan
repo-URL:en i stället läggas till i tilläggsbutiken.

1. Installera **Gym Assistant** och starta tillägget. Det exponerar webbappen på port `8099`.
2. Lägg till den som en iframe-panel i `configuration.yaml`:

   ```yaml
   panel_iframe:
     gym_assistant:
       title: Gym Assistant
       icon: mdi:dumbbell
       url: http://HOME_ASSISTANT_IP:8099
   ```

3. Ersätt `HOME_ASSISTANT_IP` med adressen som används för Home Assistant och starta om
   Home Assistant.

Om Home Assistant öppnas via HTTPS måste även Gym Assistant levereras via HTTPS för att
webbläsaren ska tillåta iframe-innehållet. Använd då en HTTPS-reverse proxy och ange dess
adress i panelkonfigurationen.

## Lokal utveckling

```sh
cd addon/gym-assistant
npm ci
npm run dev
```

Bygg och starta Node.js-servern:

```sh
npm run build
npm start
```

Appen är en Node.js-serverad Vite/TanStack Start-app. Home Assistant-tillägget bygger
produktionsversionen i sin Docker-image.
