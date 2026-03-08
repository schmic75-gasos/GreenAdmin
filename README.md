# Fluffíni Admin - React Native Expo App

Kompletní administrační aplikace pro e-shop Fluffíni, připravená k Expo buildu pro mobily i web.

## Funkce

- **Dashboard** - Přehled statistik (výdělky, objednávky, produkty)
- **Objednávky** - Správa objednávek, změna stavů, detail objednávky
- **Produkty** - CRUD operace pro produkty, kategorie, ceny
- **Sklad** - Správa skladových zásob, filtry, rychlé úpravy
- **Emaily** - Odesílání emailů, historie, šablony
- **Zprávy** - Kontaktní formulář, odpovědi
- **Server** - Monitoring serveru (CPU, RAM, disk)
- **Upozornění** - Vytváření a správa upozornění
- **Recenze** - Přehled a správa recenzí produktů
- **Analytika** - Prodeje podle kategorií, top produkty
- **Nastavení** - Konfigurace obchodu, změna hesla

## Instalace

```bash
# 1. Přejděte do složky projektu
cd fluffini-admin

# 2. Nainstalujte závislosti
npm install

# 3. Spusťte aplikaci
npm start
```

## Příkazy

```bash
# Spustit Expo dev server
npm start

# Spustit na Androidu
npm run android

# Spustit na iOS
npm run ios

# Spustit jako web
npm run web

# Build pro Android (APK)
eas build --platform android --profile preview

# Build pro Android (Play Store)
eas build --platform android --profile production

# Build pro iOS
eas build --platform ios --profile production

# Export web verze
npx expo export:web
```

## Požadavky

- Node.js 18+
- npm nebo yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI pro buildy (`npm install -g eas-cli`)

## Konfigurace

### API Endpoint

API endpoint je nastaven v `App.js`:

```javascript
const API_BASE = 'https://fluffini.cz/api';
```

### Build pro produkci

1. Přihlaste se k Expo:
   ```bash
   eas login
   ```

2. Nakonfigurujte projekt:
   ```bash
   eas build:configure
   ```

3. Vytvořte build:
   ```bash
   eas build --platform all
   ```

## Struktura projektu

```
fluffini-admin/
├── App.js              # Hlavní aplikace (vše v jednom souboru)
├── app.json            # Expo konfigurace
├── package.json        # NPM závislosti
├── babel.config.js     # Babel konfigurace
├── metro.config.js     # Metro bundler konfigurace
├── eas.json            # EAS Build konfigurace
└── assets/             # Ikony a obrázky
    ├── icon.png
    ├── splash-icon.png
    ├── adaptive-icon.png
    └── favicon.png
```

## API Endpointy

Aplikace komunikuje s těmito API endpointy:

- `POST /login` - Přihlášení
- `POST /logout` - Odhlášení
- `GET /orders` - Seznam objednávek
- `PUT /orders/:id` - Aktualizace objednávky
- `GET /products` - Seznam produktů
- `POST /products` - Přidání produktu
- `PUT /products/:id` - Úprava produktu
- `DELETE /products/:id` - Smazání produktu
- `GET /emails` - Historie emailů
- `POST /emails` - Odeslání emailu
- `GET /contact` - Zprávy z kontaktního formuláře
- `DELETE /contact/:id` - Smazání zprávy
- `GET /server-info` - Informace o serveru
- `GET /alerts` - Upozornění
- `POST /alerts` - Vytvoření upozornění
- `DELETE /alerts/:id` - Smazání upozornění
- `GET /reviews` - Recenze
- `DELETE /reviews/:id` - Smazání recenze
- `GET/PUT /settings` - Nastavení obchodu

## Licence

© Michal Schneider 2026, all rights reserved.
ADMINER v1.8 - GPL License

## Autor

Michal Schneider
