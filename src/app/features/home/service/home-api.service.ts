import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DetailData } from '../models/detail-data';

@Injectable({
  providedIn: 'root',
})
export class HomeApiService {
  constructor(private http: HttpClient) {}

  getData(): Observable<DetailData[]> {
    let endpoint =
      'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json';

    return this.http.get<DetailData[]>(endpoint);
  }
}
