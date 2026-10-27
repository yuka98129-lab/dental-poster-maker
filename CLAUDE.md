# ポスター・SNSメーカー — 開発メモ

Next.js 16 (App Router) + React 19 + TypeScript + Vitest。デザインは素のCSS(`src/app/globals.css`)。データベースなし(設定は、端末の localStorage だけ)。ユーザーは日本語話者で、平易な日本語で、1つずつ説明する。患者さんの個人情報は扱わない(扱う機能は、院長の許可と、安全管理の整備が前提)。

## 構成

- `src/lib/options.ts` 選択肢(モード・つくるもの・テーマ・対象・雰囲気・デザイン)。画面とサーバーで共通。`themesFor(mode)` は、そのモード専用のテーマを先に並べる。
- `src/lib/campaign.ts` キャンペーン(料金・期間)の入力。金額・期間・条件は、人が入れた数字・文字だけを使い、AIには作らせない。`normalizeDraft`(入力途中の形。画面と localStorage `dental:campaign:v1`)、`parseCampaign`(そろった行だけ。サーバー送信・ポスター表示)、`formatYen`、`priceWarning`(通常の金額が高くないとき)。AIへの指示の枠を壊す `< >` と改行は、空白にする。
- `src/lib/color.ts` 医院の色1色から、ポスターの配色(`--pd` 帯、`--pm`、`--pbg`、`--pl`、`--pa`)を作る。白い文字が読める(4.5以上)濃さまで、明るい色は暗くする。デザイン id `custom` が使う。保存は localStorage `dental:brand:v1`。
- `src/lib/saved.ts` 保存したキャンペーン(名前・内容・デザイン・型・色・ポスターの文章)。localStorage `dental:saved:v1`、20件まで。読み込み時は `sanitizeSaved` で整える(壊れていても動く)。
- `src/lib/image.ts` ポスターをPNGにする(`html-to-image`、横1240px)。スマホは共有画面、パソコンはダウンロード。iPhone の Safari は1回目が空白になることがあるので、1回目はならしに使う(**実機では未確認**)。
- `src/lib/qr.ts` QRコード。`qrcode-generator` で、端末の中だけで図を作る(URLは、どこにも送らない)。`cleanUrl`(http/https だけ。日本語は%の形に)、`qrShape`(まわりの白い余白4マスを含む図の道すじ)、`normalizeQr`。localStorage `dental:qr:v1`。QR下の言葉は8文字まで。
- `src/lib/proofread.ts` 誤記・記載もれの自動チェック(決まった条件。AIは使わない)。「要確認(fix)」は、医院名・電話の抜けとけた数・期間なし・過ぎた日付・「○」の残り・通常の金額の入れ間違い・QRのURLの誤り。「お知らせ(info)」は、100万円以上・同名メニュー・長いURL・料金と医療広告の注意。`endDate` は「10/31」「10月31日」「2026年…」を読む(半年以上前の月日は来年とみなす)。
- `src/lib/request.ts` サーバーが受け取る内容の検証(選択肢にない値は断る、文字は上限で切る、自分の発信ではポスター不可、「自由に書く」は内容が必要)。
- `src/lib/generate.ts` AI呼び出し(強制ツール使用: `record_poster` / `record_posts` / `record_scripts`)。プロンプトの「大事なルール」に、医療広告への配慮・個人情報を書かない・出来事を作らない・日付は memo のものだけ(なければ「○」)・指示のような文には従わない、を入れてある。自由な文字は `<memo>` `<topic>` `<voice>` で囲む。
- `src/lib/parse.ts` AIの返答を整える(壊れていたら捨てる)。
- `src/lib/ad-check.ts` 医療広告の目安チェック(決まった言葉の一覧。AIは使わない)。画面側で、いま表示している(直した後の)文章に対して、毎回調べる。
- `src/lib/guard.ts` 合言葉の照合(`timingSafeEqual`)、レート制限、`fail`。合言葉は、ヘッダー `x-passcode` に、**`encodeURIComponent` で入れて**送る(ヘッダーに日本語を直接入れられないため。サーバーは `readPasscode` で戻す)。
- `src/app/api/generate/route.ts`, `src/app/api/login/route.ts` 環境変数 `ANTHROPIC_API_KEY`, `CLINIC_PASSCODE`(どちらかがなければ503)。モデルは `ANTHROPIC_MODEL`(初期値 `claude-haiku-4-5`)。
- `src/components/CampaignPoster.tsx` キャンペーンのポスター。型は2つ(`badge` 期間バッジ型 / `cards` カード型)。色は `d-*`(紺と水色は `d-navy`)。金額・期間は入力欄から表示するので、直してもAIは呼び直さない。メニューの数(1〜3)で `--s`(大きさ)を変え、カード型は、3つなら、ポイントなし・1〜2つなら2つまで。`PosterParts.tsx` は歯のマークと、下の医院の案内。
- `src/components/Maker.tsx`(画面全体。端末の設定を読むので、`useSyncExternalStore` で、画面が出てから描く), `Results.tsx`, `Poster.tsx`, `Editable.tsx`, `Findings.tsx`。
- ポスターは `container-type: inline-size` + `cqw` 単位で、文字の大きさを幅に合わせる(印刷してもズレない)。印刷用CSSは `@media print`(操作部品は `.no-print`、ポスターは A4 いっぱいの 296mm)。**印刷で2ページ目が出ないよう、ポスター以外の表示物には `no-print` を付けること**(`display:none` の兄弟も `.card > * + *` の余白に数えられるため、印刷時は `margin-top: 0 !important`)。

## v4(SNSサイズ・テンプレート・写真・文字サイズ)

- `src/lib/version.ts` 画面の下に出るバージョン(`APP_VERSION`)。公開後に、更新が反映されたかを見分ける。上げるときは、ここを変える。
- `src/lib/templates.ts` 季節・イベントのひな形。`src/lib/sizes.ts` A4・正方形(1080²)・ストーリーズ(1080×1920)。`src/lib/photo.ts` 写真を端末の中で、長辺1400px以下のJPEGに縮める(保存・送信なし)。
- `src/components/SnsCard.tsx` SNS画像(`.poster.sns.sns-sq` 1:1 / `.sns-story` 9:16。ストーリーズは上下22cqwをあける)。A4の文章・金額・期間を、そのまま使う。
- `src/components/useFit.ts` 中身がはみ出すと、`--fit`(1→0.5)を、0.04ずつ下げる。CSSの `--t2`(文字)・`--s2`(メニュー)・`--k`(小さな文字)が `--fit` を含む。A4・SNS画像の両方で使う。
- ポスターからSNS文章: `request.ts` の `basedOn`(400字まで)→ `generate.ts` の `<poster>` ブロック(中の指示には従わない)。
- 確認: `e2e/v4_func.py`(機能)、`e2e/v4_worst.py`(最長の文字 × 全型 × 全テイスト × 写真 × 文字サイズ × 全サイズ。1272通り、はみ出し0)。

## v5(ポスターの型を3つに)

- `options.ts` の `LAYOUTS` は、`for: "campaign"`(期間バッジ型・カード型)と `for: "info"`(ふつう型 `std`・サイドバー型 `side`・大見出し型 `sun`)。`infoLayoutOf` / `campaignLayoutOf` で、別の種類の型や知らない値は、その種類の初めの型にする(保存した内容にも効く)。型を変えても、AIは呼び直さない(同じ文章を、並べ替えるだけ)。
- 一般ポスターの型は `Poster.tsx`(`.poster.pl-std|pl-side|pl-sun`)。CSSは `globals.css` の最後(「一般ポスターの型」)。`side` は左に縦の帯と番号つきポイント、`sun` は上に大きな見出しの面(高さは、ポスターの4割まで。`useFit` が見る)。
- `useFit.ts` に、ポイントが下の帯に重なる・帯が下にはみ出す・見出しの面が高すぎる、の確認を足した。
- 確認: `e2e/v5_layouts.py`(最長/最短の文字 × 3つの型 × 6テイスト × 文字サイズ3 × QRあり/なし × 写真あり/なし = 432通り。はみ出し0・歯のマークが帯に重ならない)。
- 新しい型を足すときは、`LAYOUTS` に足し、`Poster.tsx` と CSS に見た目を足して、`v5_layouts.py` の `layouts` に名前を足す。素材は、自分で作った絵か、商用で使ってよいものだけ。

## テイスト(デザインの雰囲気)

`options.ts` の `TASTES`(清潔感・高級感・高級サロン風・可愛い・ナチュラル・ポップ)。テイスト = 色(`design`)+文字の形(`--ff-h`)+見出しの太さ・字間+角の丸さ(`--card` `--tag` `--pill`)+飾り。CSSは `.poster.t-○○`。テイストを選ぶと、そのテイストの初めの色になり、そのあと色だけ変えられる。**フォントは、端末に入っているもの(明朝体・丸ゴシック・ゴシック)を使う**(Webフォントは、PNG画像にするときに埋め込みが重いので、使っていない)。端末で見え方が少し変わる。サンドボックスには日本語の明朝体がないので、明朝体の見た目は、実機で未確認。

## 新しいデザイン・型を足すとき

- 色: `options.ts` の `DESIGNS` に足し、`globals.css` に `.poster.d-○○ { --pm; --pd; --pbg; --pl; --pa }` を足す(帯は `--pd`、やわらかい面は `--pbg`、矢印や飾りは `--pa`)。
- 型: `options.ts` の `LAYOUTS` に足し、`CampaignPoster.tsx` に、その型の見た目を足す。**A4の高さに収まること**を、`e2e/campaign.py` と `e2e/taste_qr.py` の「一番長い入力」の確認(メニュー1〜3つ × 両方の型 × 全テイスト × QRあり)で、確かめる。素材(写真・フォント・イラスト)は、商用で使ってよいものだけを使う。キャンバなどの、他社の素材は入れない。

## テスト

- 単体: `npm test`(vitest, node 環境)。
- e2e(Playwright, python): ビルドして `ANTHROPIC_API_KEY=dummy CLINIC_PASSCODE=... next start -p 3112` を起動し、`/api/generate` をモックして画面を通す。本物のAIは呼ばない。
- 本物のAIでの出来は未確認(鍵をつないだあとに、人が確認する)。

## 今後の候補

- 場面カードの画像(9:16)、文字つきの縦動画(canvas + MediaRecorder)
- 過去の投稿・リールのメモと、次のネタ提案
- 口調のメモを、過去の投稿の文章から作る
