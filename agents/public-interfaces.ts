/**
 * vLLM 전용 확장 옵션 (extra_body 내에 전달)
 */
export interface VllmExtraOptions {
/** 확률 상위 K개 토큰만 후보로 선택 */
topK?: number;
/** 최상위 토큰 확률 대비 자를 최소 확률 비율 */
minP?: number;
/** 단순 반복 방지 페널티 (1.0 = 미적용, > 1.0 = 반복 억제) */
repetitionPenalty?: number;
/** Beam Search 알고리즘 적용 여부 */
useBeamSearch?: boolean;
/** Beam search 적용 시 길이 페널티 */
lengthPenalty?: number;
/** Beam search 수렴 시 조기 종료 여부 */
earlyStopping?: boolean | string;
/** 특정 토큰 ID 기준 생성 중단 목록 */
stopTokenIds?: number[];
/** 생성 억제할 단어 목록 */
badWords?: string[];
/** EOS(문장 끝) 토큰 무시하고 maxTokens까지 강제 생성 여부 */
ignoreEos?: boolean;
/** 디토크나이징 시 특별 토큰 출력 제외 여부 */
skipSpecialTokens?: boolean;
/** 요청 우선순위 (낮을수록 우선 처리) */
priority?: number;
/** 서버 측 추적을 위한 고유 요청 ID */
requestId?: string;
/** Guided Decoding 백엔드 선택 ('outlines', 'lm-format-enforcer' 등) */
guidedDecodingBackend?: string;
/** 정규표현식 기반 출력 제어 */
guidedRegex?: string;
/** 지정한 선택지 문자열 중 하나만 출력하도록 제한 */
guidedChoice?: string[];
/** EBNF 문법 규격 기반 출력 제어 */
guidedGrammar?: string;
/** JSON Schema 기반 정형 출력 제어 (객체 또는 문자열) */
guidedJson?: Record<string, any> | string;
}

/**
 * vLLM 서버 접속 기본 설정
 */
export interface VllmClient {
/** vLLM 서버 주소 (예: http://localhost:8000/v1) */
baseUrl: string;
/** vLLM 실행 시 --api-key 로 지정한 키 (미지정 시 아무 값) */
apiKey: string;
/** vLLM 실행 시 --served-model-name 으로 지정한 모델 이름 */
model: string;
}

/**
 * vLLM 클라이언트 초기화 및 호출 옵션 전체 (접속 설정 + 생성 옵션)
 */
export interface VllmChatCompletionOptions extends VllmClient {
    /** 공통 및 에이전트별 프롬프트 */
    prompts?: string | EasyAgentPrompts;
    // OpenAI 표준 Completion 옵션 (camelCase 반영)
    /** 대화 메시지 목록 (system, user, assistant 순서로 누적. 보통 패턴 메서드 호출 시 전달) */
    messages?: VllmMessage[];
    /** 샘플링 온도 (0 = 결정적, 높을수록 다양한 출력) */
    temperature?: number;
    /** 누적 확률 상위 P 안의 토큰만 후보로 선택 (nucleus sampling) */
    topP?: number;
    /** 생성할 최대 토큰 수 */
    maxTokens?: number;
    /** 생성할 최대 토큰 수 (maxTokens 의 신규 이름, 둘 중 하나만 사용) */
    maxCompletionTokens?: number;
    /** 이 문자열이 나오면 생성 중단 */
    stop?: string | string[];
    /** 토큰 단위 스트리밍 응답 여부 */
    stream?: boolean;
    /** 이미 등장한 토큰에 주는 페널티 (새 주제 유도, -2.0 ~ 2.0) */
    presencePenalty?: number;
    /** 등장 빈도에 비례한 페널티 (반복 억제, -2.0 ~ 2.0) */
    frequencyPenalty?: number;
    /** 난수 시드 (같은 값이면 같은 출력 재현 시도) */
    seed?: number;
    /** 한 요청에서 생성할 응답 개수 */
    n?: number;
    /** 출력 토큰별 로그 확률 반환 여부 */
    logprobs?: boolean;
    /** 각 위치에서 반환할 상위 후보 토큰 개수 (logprobs 사용 시) */
    topLogprobs?: number;
    /** 모델이 호출할 수 있는 도구(함수) 정의 목록 */
    tools?: Array<Record<string, any>>;
    /** 도구 사용 방식 ('auto' | 'none' | 'required' | 특정 함수 지정) */
    toolChoice?: string | Record<string, any>;
    /** 응답 형식 지정 (일반 텍스트 / JSON / JSON Schema) */
    responseFormat?: { type: "json_object" | "text" | "json_schema"; [key: string]: any };

    // vLLM 전용 확장 옵션 묶음
    /** OpenAI 표준에 없는 vLLM 전용 파라미터 */
    extraBody?: VllmExtraOptions;
}


export interface EasyAgentPrompts {
    /** 모든 요청 앞에 붙는 공통 system 프롬프트 */
    system?: string;
}

/**
 * 대화 (메세지) 한개 *(vLLM, OpenAI)
 */
export interface VllmMessage {
    /** 메시지 작성 주체 (system: 지시, user: 사람, assistant: AI, tool: 도구 호출 및 도구 실행 결과가 들어감) */
    role: "system" | "user" | "assistant" | "tool";
    /** conversation 본문 */
    content: string;
}