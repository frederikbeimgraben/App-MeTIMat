import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Order, OrderItem } from '../models/order.model';
import { HttpClient } from '@angular/common/http';
import { Location } from 'fhir/r4';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$ = this.ordersSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetches all orders (ServiceRequests) for the current user.
   */
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/v1/orders/').pipe(
      tap((orders) => this.ordersSubject.next(orders)),
      catchError((error) => {
        console.error('Error fetching orders:', error);
        return throwError(() => new Error('Could not load orders.'));
      }),
    );
  }

  /**
   * Fetches active orders (status is active or on-hold).
   */
  getActiveOrders(): Observable<Order[]> {
    return this.getAllOrders().pipe(
      map((orders) =>
        orders.filter(
          (o) =>
            (o.status as string) === 'pending' || (o.status as string) === 'available for pickup',
        ),
      ),
    );
  }

  /**
   * Fetches a specific order by ID.
   */
  getOrderById(id: string | number): Observable<Order | undefined> {
    return this.http.get<Order>(`/api/v1/orders/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching order ${id}:`, error);
        return of(undefined);
      }),
    );
  }

  /**
   * Fetches available pickup locations.
   */
  getPickupLocations(): Observable<Location[]> {
    return this.http.get<Location[]>('/api/v1/locations/').pipe(
      catchError((error) => {
        console.error('Error fetching locations:', error);
        return of([]);
      }),
    );
  }

  /**
   * Filters available pickup locations based on medication IDs.
   */
  getAvailablePickupLocations(medicationIds: string[]): Observable<Location[]> {
    // Current implementation returns all locations until backend filtering is implemented
    return this.getPickupLocations();
  }

  /**
   * Creates a new order.
   * Sends a FHIR ServiceRequest to the backend.
   */
  createOrder(items: OrderItem[], pickupLocationId: string): Observable<Order> {
    const orderPayload = {
      status: 'pending',
      // In a real app, we would send items and pickupLocationId to the backend
    };

    return this.http.post<Order>('/api/v1/orders/', orderPayload).pipe(
      tap((newOrder) => {
        const current = this.ordersSubject.value;
        this.ordersSubject.next([...current, newOrder]);
      }),
      catchError((error) => {
        console.error('Error creating order:', error);
        return throwError(() => new Error('Order creation failed.'));
      }),
    );
  }

  /**
   * Confirms payment for an order.
   */
  confirmPayment(orderId: string | number): Observable<boolean> {
    return this.updateOrderStatus(orderId, 'available for pickup');
  }

  /**
   * Updates the status of an order.
   */
  updateOrderStatus(
    orderId: string | number,
    status: 'pending' | 'available for pickup' | 'completed' | 'cancelled',
  ): Observable<boolean> {
    return this.http.patch<Order>(`/api/v1/orders/${orderId}`, { status }).pipe(
      map(() => true),
      tap(() => {
        // Refresh local state
        this.getAllOrders().subscribe();
      }),
      catchError((error) => {
        console.error('Error updating order status:', error);
        return of(false);
      }),
    );
  }
}
