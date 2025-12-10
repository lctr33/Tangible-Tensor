
export interface Vector2D {
  x: number;
  y: number;
}

export interface Matrix2x2 {
  a: number; // Row 1, Col 1
  b: number; // Row 1, Col 2
  c: number; // Row 2, Col 1
  d: number; // Row 2, Col 2
}

export enum ViewState {
  HOME = 'HOME',
  
  // Linear Algebra World
  LEVEL_SELECT_LIN_ALG = 'LEVEL_SELECT_LIN_ALG',
  LEVEL_1_VECTOR = 'LEVEL_1_VECTOR',
  VECTORS = 'VECTORS',
  SCALAR_MULTIPLICATION = 'SCALAR_MULTIPLICATION',
  LINE_EQUATION = 'LINE_EQUATION',
  DOT_PRODUCT = 'DOT_PRODUCT',
  CROSS_PRODUCT = 'CROSS_PRODUCT',
  MATRICES = 'MATRICES',
  MATRIX_MULTIPLICATION = 'MATRIX_MULTIPLICATION',
  EIGENVECTORS = 'EIGENVECTORS',
  
  // Vector Calculus World
  LEVEL_SELECT_CALCULUS = 'LEVEL_SELECT_CALCULUS',
  DERIVATIVE_DEFINITION = 'DERIVATIVE_DEFINITION',
  GRADIENT = 'GRADIENT',
  INTEGRAL = 'INTEGRAL',
  ROTATIONAL = 'ROTATIONAL', // New Level

  COMING_SOON = 'COMING_SOON',
  THEORY = 'THEORY'
}

export interface TheoryContent {
  title: string;
  concept: string;
  cognition: string;
  aiRelevance: string;
}
