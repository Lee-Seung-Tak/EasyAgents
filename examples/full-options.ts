import { vllmInit } from "../agents/client.ts";

/**
 * EasyAgents 전체 옵션 샘플
 * - 필수: baseUrl, apiKey, model
 * - 나머지는 전부 선택. 안 넣으면 기본값(또는 모델 권장값)이 적용됨
 * - 주석 처리된 옵션은 다른 옵션과 동시에 쓰면 충돌하거나 응답 형태가 바뀌는 것들
 */
const eAgents = vllmInit({
    // 서버 접속 설정 (VllmClient)
    baseUrl: "http://localhost:8000/v1",
    apiKey: "",                       // --api-key 없이 띄웠으면 빈 문자열
    model: "Qwen/Qwen3-8B",           // GET /v1/models 의 id 값

    // OpenAI 표준 옵션
    messages: [                       // 보통은 eAgents.reflection(message) 호출 시 전달
        { role: "system", content: "너는 친절한 한국어 어시스턴트야." },
        { role: "user", content: "안녕!", name: "tester" },
    ],
    temperature: 0.7,
    topP: 0.8,
    maxTokens: 1024,
    // maxCompletionTokens: 1024,     // maxTokens 와 둘 중 하나만
    stop: ["</answer>", "\n\n\n"],
    stream: false,                    // true 면 응답이 조각(SSE)으로 옴
    presencePenalty: 0,
    frequencyPenalty: 0,
    seed: 42,
    n: 1,                             // 1보다 크면 응답이 여러 개 옴
    logprobs: false,
    topLogprobs: 0,                   // logprobs: true 일 때만 의미 있음 (0~20)
    tools: [                          // vLLM 을 --enable-auto-tool-choice 로 띄워야 동작
        {
            type: "function",
            function: {
                name: "get_weather",
                description: "도시의 현재 날씨를 조회한다",
                parameters: {
                    type: "object",
                    properties: {
                        city: { type: "string", description: "도시 이름" },
                    },
                    required: ["city"],
                },
            },
        },
    ],
    toolChoice: "auto",               // "auto" | "none" | "required" | { type: "function", function: { name: "get_weather" } }
    responseFormat: { type: "text" }, // { type: "json_object" } 또는 { type: "json_schema", json_schema: {...} }

    // vLLM 전용 옵션 (VllmExtraOptions)
    extraBody: {
        topK: 20,
        minP: 0,
        repetitionPenalty: 1.05,
        stopTokenIds: [],
        badWords: ["비속어"],
        ignoreEos: false,
        skipSpecialTokens: true,
        priority: 0,                  // 서버를 --scheduling-policy priority 로 띄웠을 때만 적용
        requestId: "easyagents-sample-001",

        // Beam Search: 샘플링(temperature/topP) 대신 쓰는 방식이라 켤 때만 함께 사용
        // useBeamSearch: true,
        // lengthPenalty: 1.0,
        // earlyStopping: false,

        // Guided Decoding: 아래 중 하나만 사용 (responseFormat 과도 동시에 쓰지 않기)
        // guidedDecodingBackend: "xgrammar",
        // guidedChoice: ["긍정", "부정", "중립"],
        // guidedRegex: "\\d{3}-\\d{4}-\\d{4}",
        // guidedGrammar: 'root ::= "예" | "아니오"',
        // guidedJson: {
        //     type: "object",
        //     properties: { answer: { type: "string" } },
        //     required: ["answer"],
        // },
    },
});
