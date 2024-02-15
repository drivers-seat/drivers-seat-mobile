import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formattedNumber' })
export class FormattedNumberPipe implements PipeTransform {
  constructor() { }
  transform(value: number) {

    if (value == 0) {
      return 0;
    }

    if (value > -1 && value < 1) {
      return value.toFixed(1);
    }

    return value.toFixed(0);
  }
}

