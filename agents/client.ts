import type { VllmChatCompletionOptions, EasyAgentPrompts } from "./public-interfaces.js";

/** camelCase 키를 vLLM 이 받는 snake_case 로 변환 (예: maxTokens 는 max_tokens) */
const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

/**
 * vLLM 에 요청을 보내는 클라이언트
 * 주소, 헤더, 공통 옵션은 생성할 때 한 번만 만들어 두고 요청마다 재사용
 */
export class VllmClient {
    private readonly url: string;
    private readonly headers: Record<string, string>;
    private readonly baseBody: Record<string, unknown>;
    private readonly messages: NonNullable<VllmChatCompletionOptions["messages"]>;
    private readonly prompts: EasyAgentPrompts;

    constructor( config: VllmChatCompletionOptions ) {
        const { baseUrl, apiKey, extraBody, messages = [], prompts, ...options } = config;

        this.url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

        this.headers = { "Content-Type": "application/json" };
        if (apiKey) this.headers.Authorization = `Bearer ${apiKey}`;

        // 표준 옵션 + vLLM 전용 옵션을 최상위로 합치고, 최상위 키만 snake_case 로 변환
        // (tools, guidedJson 안쪽 키는 사용자가 정한 이름이라 그대로 유지)
        this.baseBody = {};
        for (const [key, value] of Object.entries({ ...options, ...extraBody })) {
            if (value !== undefined) this.baseBody[toSnakeCase(key)] = value;
        }

        this.messages = messages;
        this.prompts = typeof prompts == "string" ? { system: prompts } : prompts ?? {};
    }

    /**
     * 메시지를 보내고 응답을 토큰 단위 스트림으로 받음
     * 사용: for await (const text of eAgents.chat("안녕")) process.stdout.write(text);
     */
    async *chat( message: string ): AsyncGenerator<string> {
        const body = {
            ...this.baseBody,
            
            stream: true,
            messages: [
                ...(this.prompts.system ? [{ role: "system", content: this.prompts.system }] : []),
                ...this.messages, { role: "user", content: message }
            ],
        };

        const res = await fetch(this.url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            throw new Error(`vLLM 요청 실패 (${res.status}): ${await res.text()}`);
        }

        // 응답은 SSE 형식: "data: {...}" 줄이 이어지다가 "data: [DONE]" 으로 끝남
        const decoder = new TextDecoder();
        let buffer = "";
        for await (const chunk of res.body) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // 아직 덜 온 마지막 줄은 다음 조각과 합침

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (data === "[DONE]") return;

                const text = JSON.parse(data).choices?.[0]?.delta?.content;
                if (text) yield text;
            }
        }
    }
}

/**
 * vLLM 서버 연결 정보로 클라이언트를 한 번 만들어서 돌려줌
 * 사용자는 돌려받은 객체를 변수에 두고 계속 재사용
 */
export function vllmInit( initInfo: VllmChatCompletionOptions ): VllmClient {
    return new VllmClient(initInfo);
}
