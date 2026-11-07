import type { VllmChatCompletionOptions, EasyAgentPrompts } from "./public-interfaces.js";
import { performance } from "node:perf_hooks";
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
    async *chat(message: string): AsyncGenerator<string> {
        const body = {
            ...this.baseBody,
            stream: true,
            messages: [
                ...(this.prompts.system ? [{ role: "system", content: this.prompts.system }] : []),
                ...this.messages, { role: "user", content: message }
            ],
        };

        const startTime = performance.now();
        let firstTokenTime = 0;
        let totalTokens = 0;
        let isFirstToken = true; // 첫 토큰 판별용 플래그

        const res = await fetch(this.url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            throw new Error(`vLLM 요청 실패 (${res.status}): ${await res.text()}`);
        }

        const decoder = new TextDecoder();
        let buffer = "";

        for await (const chunk of res.body) {
            if (!chunk) continue; // chunk가 undefined인 경우 방어
            
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // 아직 덜 온 마지막 줄은 다음 조각과 합침

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (data === "[DONE]") {
                    const endTime = performance.now();
                    const totalSeconds = (endTime - startTime) / 1000;
                    const tps = totalSeconds > 0 ? totalTokens / totalSeconds : 0;
                    
                    console.log(`\n[통계] 총 토큰 수: ${totalTokens}개, 총 소요 시간: ${totalSeconds.toFixed(2)}초, 평균 속도: ${tps.toFixed(2)} 토큰/초`);
                    return;
                }

                try {
                    const json = JSON.parse(data);
                    const text = json.choices?.[0]?.delta?.content;
                    
                    if (text) {
                        // 첫 토큰인 경우에만 TTFT 측정
                        if (isFirstToken) {
                            firstTokenTime = performance.now();
                            const timeToFirstToken = firstTokenTime - startTime;
                            console.log(`\n[통계] 첫 토큰 응답 시간(TTFT): ${timeToFirstToken.toFixed(2)}ms`);
                            isFirstToken = false;
                        }

                        totalTokens++; // 실제 유효한 텍스트 토큰만 카운트
                        yield text;
                    }
                } catch (e) {
                    // JSON 파싱 에러 방어 (간혹 빈 줄이나 포맷이 다른 데이터가 올 때 무시)
                    continue;
                }
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
