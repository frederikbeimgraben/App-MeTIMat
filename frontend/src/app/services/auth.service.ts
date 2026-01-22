import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap } from 'rxjs';

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = '/api/v1/auth';
  private readonly usersUrl = '/api/v1/users';
  private readonly tokenKey = 'metimat_auth_token';
  private readonly userKey = 'metimat_user';

  private userSignal = signal<User | null>(null);

  currentUser = computed(() => this.userSignal());
  isAuthenticated = computed(() => !!this.userSignal());
  isAdmin = computed(() => this.userSignal()?.is_superuser || false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.checkInitialAuth();
  }

  private checkInitialAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    const savedUser = localStorage.getItem(this.userKey);

    if (token && savedUser) {
      try {
        this.userSignal.set(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem(this.userKey);
      }
    }

    if (token) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout(),
      });
    }
  }

  login(email: string, password: string): Observable<User> {
    const body = new FormData();
    body.append('username', email);
    body.append('password', password);

    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.access_token);
      }),
      switchMap(() => this.fetchCurrentUser()),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/me`).pipe(
      tap((user) => {
        this.userSignal.set(user);
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }),
    );
  }

  refreshUser(): Observable<User> {
    return this.fetchCurrentUser();
  }
}
