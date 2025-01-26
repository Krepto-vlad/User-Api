declare namespace Express {
    export interface Request {
      user?: User; 
    }
  }
  
  export type User = {
    id: string;
    name: string;
    surname: string;
    email: string;
    status: string;
    lastLogin: string; 
  }

  