# PASSAGE LAB

영어 모의고사 지문을 이용한 문장 삽입 / 문장 배열 학습 사이트입니다.

## 실행
`index.html`을 브라우저에서 열면 됩니다. 별도의 서버나 Python 설치가 필요하지 않습니다.

## GitHub Pages 배포
1. GitHub에서 새 저장소(repository)를 만듭니다.
2. `index.html`, `style.css`, `app.js`, `passages.js`, `README.md`를 저장소 최상위(root)에 업로드합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Deploy from a branch**를 선택합니다.
5. Branch는 `main`, Folder는 `/ (root)`로 설정하고 Save를 누릅니다.
6. 배포가 완료되면 표시되는 주소로 접속합니다.

## 지문 추가
`passages.js`의 `window.PASSAGES` 배열에 아래 형태로 지문을 추가하면 됩니다.

```js
{
  "date": "261101",
  "sentences": [
    "First sentence.",
    "Second sentence.",
    "Third sentence."
  ]
}
```

각 지문은 문장 단위로 분리해 주세요. 문장 배열 문제는 지문에서 문장 하나를 골라 공백 기준으로 단어를 섞어 출제합니다.

## 데이터 저장
풀이 수와 정답 수는 브라우저의 `localStorage`에 저장됩니다. 같은 브라우저의 같은 사이트 주소에서는 기록이 유지되지만, 다른 기기나 브라우저와 자동 동기화되지는 않습니다.


## 셔플 백 표시
각 지문과 문제 유형(문장 삽입 / 문장 배열)은 독립적인 셔플 백을 가집니다.
문제 화면에서 가방 번호, 가방 내 진행 상황, 전체 출제 순번 범위를 확인할 수 있습니다.
한 가방의 모든 문항을 출제하면 다음 가방을 새로 섞어 생성합니다.
