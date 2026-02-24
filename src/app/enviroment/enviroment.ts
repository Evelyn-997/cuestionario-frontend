import { Injectable } from '@angular/core';


export const environment = {
  production: false,
  //apiBaseUrl: 'http://localhost:8085'
  apiBaseUrl: 'https://cuestionario-backend-17tb.onrender.com'
};
@Injectable({
  providedIn: 'root',
})
export class Enviroment {

}
