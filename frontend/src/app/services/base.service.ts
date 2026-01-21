import { Observable } from 'rxjs';

export interface BaseService<T> {
  getAll(): Observable<T[]>;
  getById(id: string): Observable<T | undefined>;
  create(item: T): Observable<T>;
  update(id: string, item: Partial<T>): Observable<T>;
  delete(id: string): Observable<boolean>;
}

export abstract class MockBaseService<T extends { id: string }> implements BaseService<T> {
  protected items: T[] = [];

  getAll(): Observable<T[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([...this.items]);
        observer.complete();
      }, 100);
    });
  }

  getById(id: string): Observable<T | undefined> {
    return new Observable(observer => {
      setTimeout(() => {
        const item = this.items.find(i => i.id === id);
        observer.next(item);
        observer.complete();
      }, 100);
    });
  }

  create(item: T): Observable<T> {
    return new Observable(observer => {
      setTimeout(() => {
        this.items.push(item);
        observer.next(item);
        observer.complete();
      }, 100);
    });
  }

  update(id: string, updates: Partial<T>): Observable<T> {
    return new Observable(observer => {
      setTimeout(() => {
        const index = this.items.findIndex(i => i.id === id);
        if (index !== -1) {
          this.items[index] = { ...this.items[index], ...updates };
          observer.next(this.items[index]);
        } else {
          observer.error(new Error('Item not found'));
        }
        observer.complete();
      }, 100);
    });
  }

  delete(id: string): Observable<boolean> {
    return new Observable(observer => {
      setTimeout(() => {
        const index = this.items.findIndex(i => i.id === id);
        if (index !== -1) {
          this.items.splice(index, 1);
          observer.next(true);
        } else {
          observer.next(false);
        }
        observer.complete();
      }, 100);
    });
  }
}
