import { vllmInit } from "./agents/client.ts";

// .env 의 VLLM_URL, VLLM_API_KEY, VLLM_MODEL 을 process.env 로 불러옴
process.loadEnvFile();

// 전체 옵션 예시는 examples/full-options.ts 참고
const eAgents = vllmInit({
    prompts: "당신의 이름은 이지에이전트 입니다.",
    baseUrl: process.env.VLLM_URL ?? "",
    apiKey: process.env.VLLM_API_KEY ?? "",
    model: process.env.VLLM_MODEL ?? "",
    temperature: 0.7,
});

// 응답을 토큰이 오는 대로 출력
for await (const text of eAgents.chat("안녕! 너 이름은 뭐야?")) {
    process.stdout.write(text);
}
process.stdout.write("\n");
