# SET – Träningslogg

En lokal träningslogg för att följa övningar och träningspass.

```sh
npm install
npm run dev
```

Kör tester med `npm test` och skapa en produktionsbuild med `npm run build`.

## Kör på mobilen

För att testa i mobilens webbläsare på samma nätverk:

```sh
npm run dev:mobile
```

Öppna `http://<datorns-lokala-ip>:8080` på mobilen. Hitta datorns IP-adress i
nätverksinställningarna. Tillåt anslutningen i datorns brandvägg om den blockeras.

För att testa den installerbara PWA-versionen, bygg och starta förhandsvisningen:

```sh
npm run build
npm run preview
```

Öppna den lokala adress som visas i terminalen. För att göra förhandsvisningen tillgänglig
för mobilen på samma nätverk, använd `npm run preview:mobile` och öppna port 8080 via en
HTTPS-portvidarebefordran, till exempel VS Codes **Ports**-vy. Service workers och
installation av PWA kräver HTTPS (eller `localhost`).

### Installera på Android för offlinebruk

1. Starta en produktionsförhandsvisning enligt stegen ovan och öppna HTTPS-adressen i Chrome på Android.
2. Låt appen läsa in klart medan mobilen är online. Välj sedan **Installera app** i Chrome-menyn
   (eller **Lägg till på startskärmen**).
3. Öppna appen från startskärmen en gång medan du är online. Därefter kan du prova att slå på
   flygplansläge och starta appen igen.

Detta installerar en PWA, inte en separat APK. Träningsdata sparas lokalt på mobilen och synkas
inte automatiskt till andra enheter. Utvecklingsläget (`npm run dev:mobile`) är inte installerbart;
använd produktionsförhandsvisningen eller en HTTPS-publicering.
