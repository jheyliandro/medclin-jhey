export type ApiErrorCode =
  | 'DADOS_INVALIDOS'
  | 'NAO_AUTENTICADO'
  | 'CREDENCIAIS_INVALIDAS'
  | 'ACESSO_NEGADO'
  | 'RECURSO_NAO_ENCONTRADO'
  | 'EMAIL_JA_CADASTRADO'
  | 'CPF_JA_CADASTRADO'
  | 'CRM_JA_CADASTRADO'
  | 'HORARIO_INDISPONIVEL'
  | 'PACIENTE_INDISPONIVEL'
  | 'HORARIO_FORA_DA_ESCALA'
  | 'TRANSICAO_INVALIDA';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;

  constructor(
    message: string,
    statusCode: number = 400,
    code?: ApiErrorCode,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code ?? this.defaultCode(statusCode);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private defaultCode(statusCode: number): ApiErrorCode {
    switch (statusCode) {
      case 401:
        return 'NAO_AUTENTICADO';
      case 403:
        return 'ACESSO_NEGADO';
      case 404:
        return 'RECURSO_NAO_ENCONTRADO';
      case 409:
        return 'EMAIL_JA_CADASTRADO';
      case 422:
        return 'HORARIO_FORA_DA_ESCALA';
      default:
        return 'DADOS_INVALIDOS';
    }
  }
}
