import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, User, TokenResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: spy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage after each test to ensure isolation
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully, store token and fetch user', () => {
    const mockToken: TokenResponse = { access_token: 'fake-jwt-token', token_type: 'bearer' };
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      is_superuser: false
    };

    service.login('test@example.com', 'password').subscribe((response) => {
      expect(response).toEqual(mockToken);
      expect(localStorage.getItem('metimat_auth_token')).toBe('fake-jwt-token');
    });

    // Expect login request
    const loginReq = httpMock.expectOne('/api/v1/auth/login');
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush(mockToken);

    // Expect user fetch request
    const userReq = httpMock.expectOne('/api/v1/users/me');
    expect(userReq.request.method).toBe('GET');
    userReq.flush(mockUser);

    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
  });

  it('should logout and clear state', () => {
    localStorage.setItem('metimat_auth_token', 'existing-token');

    service.logout();

    expect(localStorage.getItem('metimat_auth_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return correct auth headers when token is present', () => {
    const token = 'my-secret-token';
    localStorage.setItem('metimat_auth_token', token);

    const headers = service.getAuthHeaders();
    expect(headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should correctly identify admin status', () => {
    const adminUser: User = {
      id: 2,
      email: 'admin@example.com',
      full_name: 'Admin User',
      is_active: true,
      is_superuser: true
    };

    // Manually update the signal for testing
    // Note: userSignal is private, but we can access it for testing purposes via any
    (service as any).userSignal.set(adminUser);

    expect(service.isAdmin()).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
  });
});
