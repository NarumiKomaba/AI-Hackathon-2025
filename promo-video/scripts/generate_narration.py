
import os
from google.cloud import texttospeech
import json

# 設定
CREDENTIALS_PATH = "c:/hackathon/service-account.json"
OUTPUT_DIR = "c:/hackathon/promo-video/public/audio"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH

# ナレーション原稿とファイル名のリスト
NARRATIONS = [
    ("introduction", "プロジェクトという名のクエストを攻略せよ。ジェミニ 2.5 フラッシュを搭載した次世代プロジェクト管理ツール、プロジェクト・クエストの全貌を紹介します。"),
    ("board_intro", "まずはメインボード。左側のクエストリストをスクロールして、今自分がどの冒険に参加しているか一瞬で把握。アールピージー風のユウアイが、膨大な案件管理を直感的な『ギルドの依頼板』へと変えてくれます。"),
    ("quest_new", "新しいクエストの登録も簡単。プロジェクトの目的や概要を入力すれば、そこから新しい冒険の物語が始まります。"),
    ("quests_detail", "クエスト詳細画面では、ガントチャートによるスケジュール管理はもちろん、特筆すべきはこのギルドマスターのコメント！ 状況を自動分析して、今、指揮官が意識すべきポイントを的確にアドバイス。孤独なピーエムの隣に、常に賢者が寄り添います。"),
    ("status_screen", "あなたの頑張りはすべて数値化。独自のステータス画面で、スキルレベルや現在の称号を確認。仕事を通じた成長を、アールピージーのキャラクターのように実感できるんです。"),
    ("report_generation", "そして強力な報告書生成機能。内部データを瞬時に解析してプレビューを表示。しかもこれ、その場で自由に書き換え可能なんです。エーアイが書いたドラフトをサッと整えるだけで、面倒な報告作業が爆速で完結します。"),
    ("mode_switch", "プロジェクトの空気に合わせて、デザインを切り替え。情緒あふれるアールピージーモードと、カチッとしたビジネスモード。どちらのモードでも、データの透明性は変わりません。"),
    ("council_meeting", "ここが神髄、エーアイ評議会！ 異なる専門性を持つエーアイたちがストリーミングで議論を展開。反対意見もあえてぶつけることで、議論はより深く、より本音に近いところへ。気に入った案を『採用』すれば、さらに議論を収束させ、具体的アクションへと落とし込んでくれます。"),
    ("council_report", "評議会の結果はそのままレポート化。さらに、報告時に突っ込まれそうなポイントを予測した『想定きゅうエー』まで自動生成。会議の準備は、もうエーアイと一緒に終わらせる時代です。"),
    ("ending", "集計ではなく、意思決定を。プロジェクト・クエスト。さあ、あなたもプロジェクト管理の新しい扉を開きましょう。")
]

def generate_narration():
    client = texttospeech.TextToSpeechClient()
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for i, (name, text) in enumerate(NARRATIONS):
        print(f"Generating audio for: {name}...")
        
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        # ボイス設定 (Neural2-B は落ち着いた高品質な日本語音声だよっ💕)
        voice = texttospeech.VoiceSelectionParams(
            language_code="ja-JP",
            name="ja-JP-Neural2-B" 
        )
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.05, # ちょっとだけ速めにしてテンポ良く！
            pitch=0.0
        )
        
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        
        filename = f"narration_{i}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, "wb") as out:
            out.write(response.audio_content)
            print(f"Audio content written to file: {filepath}")

    print("All narrations generated successfully! ✨")

if __name__ == "__main__":
    generate_narration()
