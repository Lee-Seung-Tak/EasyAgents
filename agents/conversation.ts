export class Conversation {
    private messages: VllmMessage[] = [];

    /** 사람과 AI가 주고받은 turn add */
    add(user: string, assistant: string) {...}
    /** 보낼 메시지 목록 (복사본) */
    toArray(): VllmMessage[] { return [...this.messages]; }
    /** 기록 비우기 */
    reset() { this.messages = []; }
}