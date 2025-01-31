import { ID } from '@datorama/akita';
import { ColorHelper } from '@swimlane/ngx-charts';

export interface Ui {
  id: ID;
  colors: ColorHelper;
  dateRange: Array<Date>;

}

/**
 * A factory function that creates Ui
 */
export function createUi(params: Partial<Ui>) {
  return {

  } as Ui;
}
