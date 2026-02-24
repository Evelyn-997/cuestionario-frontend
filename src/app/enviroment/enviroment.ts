import { Injectable } from '@angular/core';


export const environment = {
  production: false,
  //apiBaseUrl: 'http://localhost:8085'
  apiBaseUrl: 'https://cuestionario-frontend.vercel.app'
};
@Injectable({
  providedIn: 'root',
})
export class Enviroment {

}
