export interface ITerms{
  current_terms: Terms;
  current_accepted_terms: AcceptedTerms;
  future_terms: Terms;
  future_accepted_terms: AcceptedTerms;
}

// Represents a terms of service that the user has/must/will need to accept
export class Terms {
  constructor(
    public id: number,
    public title: string,
    public text: string,
    public required_at: string
  ) { }

  static parseTerms(terms) {
    return new Terms(
      terms["id"],
      terms["title"],
      terms["text"],
      terms["required_at"]
    );
  }
}


// Represents a terms of service that the user has accepted
export class AcceptedTerms {
  constructor(
    public id: number,
    public accepted_at: string,
    public terms_id: number,
  ) { }

  static parseTerms(terms) {
    return new AcceptedTerms(
      terms["id"],
      terms["accepted_at"],
      terms["terms_id"],
    );
  }
}