☕︎ Europäischer Durak - Online-Kartenspiel
Das Onlinespiel ist meine Version vom Kartenspiel (das ich einst in der Uni von einer Kommilitonin beigebracht bekommen habe.)
Das Projekt wurde als Semesterarbeit für das Modul Webtechnologien entwickelt.

☕︎ Die Features:
· Multiplayer-Kartenspiel mit bis zu 4 Spielern
· Phasen-System (Handkarten ➺ Offene Karten ➺ Verdeckte Karten)
· Spezialregeln:
    ↳ Vier gleiche Karten ➺ Stapel wird verbrannt
    ↳ Zehn ➺ Stapel wird verbrannt
· Login-/Registrierungsfunktion (JWT-basiert)
· Lobbys zum Starten neuer Spiele
· Automatische Aktualisierung des Spielfeldes
· Responsives, modernes Design (Angular/Angular Material)
· MongoDB-Datenbank für Spiel-/Benutzerdaten

☕︎ Technik dahinter:
· Frontend: Angular (mit Angular Material, SCSS)
· Backend: Node.js + Express
· Datenbank: MongoDB (Mongoose)
· Auth: JWT (JSON Web Tokens)
· Styles: Angular Material + eigenes SCSS


☕︎ Projektstruktur:
⎪
⎪⸻ client / (Angular-Frontend)
⎪        ↳ src
⎪        ↳ README
⎪        ↳ angular
⎪        ↳ ...
⎪
⎪⸻ server/ (Node.js-Frontend)
⎪        ↳ src
⎪        ↳ .env
⎪        ↳ ...

☕︎ CRUD:
· Create: Lobby erstellen
· Read: Liste der Lobbies/ Spiele
· Update: Karten spielen/ Lobby joinen
· Delete: Spiel/ Lobby löschen (von dem Ersteller)

☕︎ Installation:
· Im client Ordner ng serve  rennen
· Im server Ordner npm serve rennen

☕︎ Screenshots:
⤖ Registrieren
<img width="1888" height="915" alt="readme-regist" src="https://github.com/user-attachments/assets/12c3e95c-a583-44d0-8331-5eb57d3a61e0" />

⤖ Login
<img width="1885" height="916" alt="readme-login" src="https://github.com/user-attachments/assets/56bbad49-1407-465a-bc54-443c7c6fc34e" />

⤖ Lobby
<img width="1898" height="911" alt="readme-lobby" src="https://github.com/user-attachments/assets/cbd081b5-39c7-46d6-add7-b976fc1c15ec" />

⤖ In-Game
<img width="1896" height="908" alt="readme-game" src="https://github.com/user-attachments/assets/eb2cfca2-ed0e-49f7-a012-4b56a0d9bd27" />

☕︎ KI-Hinweise
· KI-Unterstützung mit ChatGPT genutzt für Codehilfe und Bugfixes
· KI-Unterstützung mit Google Gemini für research der Code-Commands

☕︎ Deployment
· Backend: Render
· Frontend: Vercel
· Datenbank: Mongo Atlas
