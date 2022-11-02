export class FormDesign {
  constructor(
    public title?: string,
    // public name?: string,
    public description?: string,
    public priority?: string,
    public location?: string,
    public startDate?: Date,
    public endDate?: Date,
    public polygonDraw?: string,
    public pointDraw?: string,
    public phenomena?: string
  ) {}
}
