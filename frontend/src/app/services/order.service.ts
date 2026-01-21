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
    return this.http.get<Order[]>('/api/orders').pipe(
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
          (o) => o.status === 'active' || o.status === 'on-hold' || o.status === 'draft',
        ),
      ),
    );
  }

  /**
   * Fetches a specific order by ID.
   */
  getOrderById(id: string): Observable<Order | undefined> {
    return this.http.get<Order>(`/api/orders/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching order ${id}:`, error);
        return of(undefined);
      }),
    );
  }

  /**
   * Fetches available pickup locations.
   * (Currently returning empty as backend implementation for Locations is pending)
   */
  getPickupLocations(): Observable<Location[]> {
    // TODO: Implement /api/locations backend endpoint
    return of([]);
  }

  /**
   * Filters available pickup locations based on medication IDs.
   */
  getAvailablePickupLocations(medicationIds: string[]): Observable<Location[]> {
    // TODO: Implement backend filtering logic
    return of([]);
  }

  /**
   * Creates a new order.
   * Sends a FHIR ServiceRequest to the backend.
   */
  createOrder(items: OrderItem[], pickupLocationId: string): Observable<Order> {
    const orderPayload = {
      resourceType: 'ServiceRequest',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/current' }, // Backend will resolve the authenticated user
      note: items.map((item) => ({
        text: `Item: ${item.medicationName}, Quantity: ${item.quantity}`,
      })),
      // In a real scenario, we would add detailed extensions or contained resources for items
    };

    return this.http.post<Order>('/api/orders', orderPayload).pipe(
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
  confirmPayment(orderId: string): Observable<boolean> {
    return this.updateOrderStatus(orderId, 'paid');
  }

  /**
   * Updates the status of an order.
   */
  updateOrderStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'ready_for_pickup' | 'dispensed' | 'completed' | 'active',
  ): Observable<boolean> {
    return this.http.patch<Order>(`/api/orders/${orderId}/status`, { status }).pipe(
      map(() => true),
      tap(() => {
        // Optimistically update local state or re-fetch
        const current = this.ordersSubject.value;
        const index = current.findIndex((o) => o.id === orderId);
        if (index !== -1) {
          // A proper implementation would merge the response, but here we just assume success
          // Ideally, we would re-fetch the order to get the updated FHIR resource
          this.getAllOrders().subscribe();
        }
      }),
      catchError((error) => {
        console.error('Error updating order status:', error);
        return of(false);
      }),
    );
  }
}
