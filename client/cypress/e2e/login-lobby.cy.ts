///<reference types="cypress"/>

describe('Login Flow', () => {
  it('should log in and go to lobbies', () => {
    // 1. Starte die App
    cy.visit('http://localhost:4200/login');

    // 2. Tippe Username + Passwort ein
    cy.get('input[name="username"]').type('alice');
    cy.get('input[name="password"]').type('test123');

    // 3. Klicke auf den Login-Button
    cy.get('button[type="submit"]').click();

    // 4. Überprüfe, dass wir auf der Lobby-Seite sind
    cy.url().should('include', '/lobbies');
  });
});