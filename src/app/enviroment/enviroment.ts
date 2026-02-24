import { Injectable } from '@angular/core';


export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8085'
};
@Injectable({
  providedIn: 'root',
})
export class Enviroment {

}
