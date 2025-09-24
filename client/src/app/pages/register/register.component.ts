import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatCardModule }       from '@angular/material/card';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  username = '';
  password = '';
  confirm  = '';
  error = '';
  success = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(f: NgForm) {
    if (f.invalid) return;
    this.error = ''; this.success = '';
    if (this.password !== this.confirm) {
      this.error = 'Passwörter stimmen nicht überein';
      return;
    }
    this.auth.register(this.username.trim(), this.password).subscribe({
      next: () => {
        this.success = 'Registrierung erfolgreich! Du wirst weitergeleitet …';
        setTimeout(() => this.router.navigateByUrl('/login'), 900);
      },
      error: (e) => this.error = e?.error?.error || 'Registrierung fehlgeschlagen'
    });
  }
}
