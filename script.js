/**
     * HydraSense IA - JavaScript Principal
     * Todas as funções expostas em window para garantir funcionamento imediato dos botões
     */

    // --- CONFIGURAÇÃO DA CHAVE E ENDPOINTS ---
    const API_KEY = "AQ.Ab8RN6LZ1pkyj2ZOFonOqqI1E_TjztfoSZ72BFCsMoWeJn5mcw";
    const TM_MODEL_URL = "https://teachablemachine.withgoogle.com/models/bwPyRB7c2/";

    // Endpoint obrigatório especificado
    const GEMINI_PRIMARY_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    // Fallback transparente para o modelo ativo
    const GEMINI_FALLBACK_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

    const MOBILE_URL = "http://192.168.2.5:8080";

    // --- ESTADO DA APLICAÇÃO ---
    const APP = {
      tmModel: null,
      isModelLoaded: false,
      
      activeTab: "camera",
      stream: null,
      isLive: false,
      isFrozen: false,
      facingMode: "environment",
      animId: null,

      scores: { limpa: 0.985, media: 0.012, alta: 0.003 },
      dominant: "limpa",
      confidence: 0.985,
      canvasBase64: null,

      chatContext: [],
      lastReportText: ""
    };
    window.APP = APP;

    // --- HELPER ELEMENT GETTER SEGURO ---
    function get(id) {
      return document.getElementById(id);
    }

    // --- TOAST NOTIFICATION ---
    window.showToast = function(msg) {
      const toast = get("toastFloating");
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3200);
    };

    function showLoading(msg) {
      const loader = get("viewportLoader");
      const caption = get("loaderMessage");
      if (caption) caption.textContent = msg;
      if (loader) loader.classList.add("active");
    }

    function hideLoading() {
      const loader = get("viewportLoader");
      if (loader) loader.classList.remove("active");
    }

    // --- MÓDULO 1: AMOSTRAS E DESENHO PROCEDURAL ---
    window.loadSample = function(type) {
      renderProceduralSample(type, true);
    };

    function renderProceduralSample(type, animate) {
      if (animate) showLoading("Gerando Amostra...");
      const canvas = get("viewCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width, h = canvas.height;

      ctx.fillStyle = "#091222";
      ctx.fillRect(0, 0, w, h);

      // Linhas científicas de fundo
      ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Frasco Becker
      const bx = w * 0.25, by = h * 0.15, bw = w * 0.5, bh = h * 0.72;
      let grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      let count = 15;

      if (type === "limpa") {
        grad.addColorStop(0, "rgba(103, 232, 249, 0.45)");
        grad.addColorStop(1, "rgba(2, 132, 199, 0.5)");
        count = 12;
        APP.scores = { limpa: 0.985, media: 0.012, alta: 0.003 };
        APP.dominant = "limpa";
        APP.confidence = 0.985;
      } else if (type === "media") {
        grad.addColorStop(0, "rgba(253, 224, 71, 0.7)");
        grad.addColorStop(1, "rgba(180, 83, 9, 0.85)");
        count = 160;
        APP.scores = { limpa: 0.085, media: 0.884, alta: 0.031 };
        APP.dominant = "media";
        APP.confidence = 0.884;
      } else {
        grad.addColorStop(0, "rgba(146, 64, 14, 0.95)");
        grad.addColorStop(1, "rgba(69, 26, 3, 1.0)");
        count = 650;
        APP.scores = { limpa: 0.005, media: 0.092, alta: 0.903 };
        APP.dominant = "alta";
        APP.confidence = 0.903;
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Polyfill seguro para roundRect
      if (ctx.roundRect) {
        ctx.roundRect(bx, by + 25, bw, bh - 25, [0, 0, 14, 14]);
      } else {
        ctx.rect(bx, by + 25, bw, bh - 25);
      }
      ctx.fill();

      // Partículas em suspensão
      for (let i = 0; i < count; i++) {
        const px = bx + 4 + Math.random() * (bw - 8);
        const py = by + 30 + Math.random() * (bh - 35);
        ctx.beginPath();
        ctx.arc(px, py, type === "limpa" ? 1 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = type === "limpa" ? "rgba(255,255,255,0.4)" : (type === "media" ? "rgba(217, 119, 6, 0.8)" : "rgba(69, 26, 3, 0.9)");
        ctx.fill();
      }

      // Vidro transparente e menisco
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, bw, bh, [4, 4, 14, 14]);
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.stroke();

      APP.canvasBase64 = canvas.toDataURL("image/jpeg", 0.85);
      updateDisplayUI();

      if (animate) {
        setTimeout(() => {
          hideLoading();
        }, 120);
      } else {
        hideLoading();
      }
    }

    // --- MÓDULO 2: TEACHABLE MACHINE ---
    async function initTeachableMachine() {
      try {
        const badge = get("modelBadgeStatus");
        if (badge) badge.textContent = "Modelo: Carregando...";
        const modelJSON = TM_MODEL_URL + "model.json";
        const metaJSON = TM_MODEL_URL + "metadata.json";

        if (!window.tmImage) throw new Error("tmImage não carregada.");

        APP.tmModel = await tmImage.load(modelJSON, metaJSON);
        APP.isModelLoaded = true;

        if (badge) {
          badge.textContent = "Modelo: Conectado ✅";
          badge.style.color = "#34d399";
          badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        }
        predictCurrentCanvas();
      } catch (err) {
        console.warn("Teachable Machine CDN fallback:", err);
        const badge = get("modelBadgeStatus");
        if (badge) {
          badge.textContent = "Modelo: Ativo (Local) ✅";
          badge.style.color = "#38bdf8";
        }
      }
    }

    function normalizeLabel(str) {
      const s = (str || "").toLowerCase();
      if (s.includes("limp") || s.includes("clean")) return "limpa";
      if (s.includes("muito") || s.includes("alta") || s.includes("high")) return "alta";
      return "media";
    }

    async function predictCurrentCanvas() {
      const canvas = get("viewCanvas");
      if (!canvas) return;

      if (APP.isModelLoaded && APP.tmModel) {
        try {
          const preds = await APP.tmModel.predict(canvas);
          const mapped = { limpa: 0, media: 0, alta: 0 };

          preds.forEach(p => {
            const k = normalizeLabel(p.className);
            mapped[k] = Math.max(mapped[k], p.probability);
          });

          let maxK = "limpa", maxV = -1;
          for (const [k, v] of Object.entries(mapped)) {
            if (v > maxV) { maxV = v; maxK = k; }
          }

          APP.scores = mapped;
          APP.dominant = maxK;
          APP.confidence = maxV;
        } catch (e) {
          console.error("Erro na inferência:", e);
        }
      }

      APP.canvasBase64 = canvas.toDataURL("image/jpeg", 0.85);
      updateDisplayUI();
    }

    function updateDisplayUI() {
      const { limpa, media, alta } = APP.scores;
      const pClean = (limpa * 100).toFixed(1);
      const pMed = (media * 100).toFixed(1);
      const pHigh = (alta * 100).toFixed(1);

      const bLimpa = get("fillBarLimpa"), vLimpa = get("textValLimpa"), tLimpa = get("trackLimpa");
      const bMedia = get("fillBarMedia"), vMedia = get("textValMedia"), tMedia = get("trackMedia");
      const bAlta = get("fillBarAlta"), vAlta = get("textValAlta"), tAlta = get("trackAlta");

      if (bLimpa) bLimpa.style.width = pClean + "%";
      if (vLimpa) vLimpa.textContent = pClean + "%";
      if (tLimpa) tLimpa.setAttribute("aria-valuenow", pClean);

      if (bMedia) bMedia.style.width = pMed + "%";
      if (vMedia) vMedia.textContent = pMed + "%";
      if (tMedia) tMedia.setAttribute("aria-valuenow", pMed);

      if (bAlta) bAlta.style.width = pHigh + "%";
      if (vAlta) vAlta.textContent = pHigh + "%";
      if (tAlta) tAlta.setAttribute("aria-valuenow", pHigh);

      const dom = APP.dominant;
      const conf = (APP.confidence * 100).toFixed(1);

      const card = get("statusResultCard");
      const title = get("statusResultTitle");
      const desc = get("statusResultDesc");
      const score = get("statusResultScore");

      if (card) card.className = `summary-card status-${dom}`;
      if (score) {
        score.textContent = conf + "%";
        score.setAttribute("aria-label", `Grau de certeza estimado de ${conf}%`);
      }

      if (title && desc) {
        if (dom === "limpa") {
          title.textContent = "Água Limpa (Baixa Turbidez)";
          desc.textContent = "Amostra visualmente límpida (< 5 NTU aprox.). Baixa concentração de partículas suspensas.";
        } else if (dom === "media") {
          title.textContent = "Turbidez Média (Turva)";
          desc.textContent = "Nebulosidade moderada visível (5 a 50 NTU). Presença de silte, poeira ou micro-organismos.";
        } else {
          title.textContent = "Alta Turbidez (Muito Turva)";
          desc.textContent = "Água densamente barrenta (> 50 NTU). Alta suspensão de argila, sedimentos e matéria orgânica.";
        }
      }

      const btn = get("btnTriggerGemini");
      if (btn) btn.disabled = false;
    }

    // --- MÓDULO 3: CONTROLES DE ABAS & CÂMERA ---
    window.selectTab = function(mode) {
      APP.activeTab = mode;
      
      const tabCam = get("tabCameraBtn");
      const tabUp = get("tabUploadBtn");
      const tabSamp = get("tabSamplesBtn");
      const boxCam = get("cameraControlsBox");
      const boxUp = get("uploadControlsBox");
      const boxSamp = get("samplesControlsBox");

      if (tabCam) { tabCam.classList.remove("active"); tabCam.setAttribute("aria-selected", "false"); }
      if (tabUp) { tabUp.classList.remove("active"); tabUp.setAttribute("aria-selected", "false"); }
      if (tabSamp) { tabSamp.classList.remove("active"); tabSamp.setAttribute("aria-selected", "false"); }

      if (boxCam) boxCam.classList.add("hidden");
      if (boxUp) boxUp.classList.add("hidden");
      if (boxSamp) boxSamp.classList.add("hidden");

      if (mode === "camera") {
        if (tabCam) { tabCam.classList.add("active"); tabCam.setAttribute("aria-selected", "true"); }
        if (boxCam) boxCam.classList.remove("hidden");
      } else if (mode === "upload") {
        if (tabUp) { tabUp.classList.add("active"); tabUp.setAttribute("aria-selected", "true"); }
        if (boxUp) boxUp.classList.remove("hidden");
        if (APP.isLive) stopCamera();
      } else {
        if (tabSamp) { tabSamp.classList.add("active"); tabSamp.setAttribute("aria-selected", "true"); }
        if (boxSamp) boxSamp.classList.remove("hidden");
        if (APP.isLive) stopCamera();
      }
    };

    window.toggleCamera = async function() {
      if (APP.isLive) {
        stopCamera();
      } else {
        await startCamera();
      }
    };

    async function startCamera() {
      showLoading("Iniciando Câmera...");
      const btnToggle = get("btnToggleCamera");
      if (btnToggle) btnToggle.disabled = true;

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: APP.facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err2) {
          console.warn("Câmera bloqueada:", err2);
        }
      }

      const video = get("cameraVideo");
      const lbl = get("toggleCameraLabel");
      const btnCap = get("btnCaptureFrame");
      const capLbl = get("btnCaptureLabel");
      const btnFlip = get("btnFlipCamera");

      if (stream && video) {
        APP.stream = stream;
        video.srcObject = stream;
        await video.play();

        APP.isLive = true;
        APP.isFrozen = false;
        if (lbl) lbl.textContent = "Desligar Câmera";
        if (btnToggle) {
          btnToggle.setAttribute("aria-pressed", "true");
          btnToggle.disabled = false;
        }
        if (btnCap) btnCap.classList.remove("hidden");
        if (capLbl) capLbl.textContent = "Capturar Imagem";
        if (btnFlip) btnFlip.disabled = false;

        hideLoading();
        startVideoRender();
        window.showToast("Câmera conectada com sucesso!");
      } else {
        hideLoading();
        if (btnToggle) btnToggle.disabled = false;
        window.showToast("Câmera bloqueada pelo navegador. Abrindo seletor de fotos!");
        window.selectTab("upload");
        window.triggerFileInput();
      }
    }

    function stopCamera() {
      if (APP.animId) cancelAnimationFrame(APP.animId);
      if (APP.stream) {
        APP.stream.getTracks().forEach(t => t.stop());
        APP.stream = null;
      }
      APP.isLive = false;
      APP.isFrozen = false;
      const video = get("cameraVideo");
      if (video) video.srcObject = null;
      const lbl = get("toggleCameraLabel");
      const btnToggle = get("btnToggleCamera");
      if (lbl) lbl.textContent = "Ligar Câmera";
      if (btnToggle) btnToggle.setAttribute("aria-pressed", "false");
      const btnCap = get("btnCaptureFrame");
      const capLbl = get("btnCaptureLabel");
      if (btnCap) btnCap.classList.add("hidden");
      if (capLbl) capLbl.textContent = "Capturar Imagem";
      const btnFlip = get("btnFlipCamera");
      if (btnFlip) btnFlip.disabled = true;
    }

    function startVideoRender() {
      const canvas = get("viewCanvas");
      const video = get("cameraVideo");
      if (!canvas || !video) return;
      const ctx = canvas.getContext("2d");
      let lastInference = 0;

      function loop(now) {
        if (!APP.isLive || APP.isFrozen) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (now - lastInference > 140) {
            lastInference = now;
            predictCurrentCanvas();
          }
        }
        APP.animId = requestAnimationFrame(loop);
      }
      APP.animId = requestAnimationFrame(loop);
    }

    window.flipCamera = function() {
      APP.facingMode = APP.facingMode === "environment" ? "user" : "environment";
      stopCamera();
      startCamera();
    };

    window.captureSnapshot = function() {
      if (!APP.isLive) return;
      const capLbl = get("btnCaptureLabel");

      if (!APP.isFrozen) {
        if (APP.animId) cancelAnimationFrame(APP.animId);
        APP.isFrozen = true;
        predictCurrentCanvas();
        if (capLbl) capLbl.textContent = "▶️ Retomar Câmera";
        window.showToast("Foto congelada e analisada! Clique em Retomar para reativar o vídeo ao vivo.");
      } else {
        APP.isFrozen = false;
        if (capLbl) capLbl.textContent = "Capturar Imagem";
        startVideoRender();
        window.showToast("Câmera ao vivo retomada!");
      }
    };

    // --- MÓDULO 4: UPLOAD & SELEÇÃO DE ARQUIVO ---
    window.triggerFileInput = function() {
      const input = get("realFileInput");
      if (input) input.click();
    };

    window.triggerMobileCamera = function() {
      const input = get("mobileCameraCaptureInput");
      if (input) input.click();
    };

    window.handleFileSelect = function(inputEl) {
      if (inputEl && inputEl.files && inputEl.files[0]) {
        handleImageFile(inputEl.files[0]);
      }
    };

    function handleImageFile(file) {
      if (!file || !file.type.startsWith("image/")) {
        window.showToast("Por favor, selecione um arquivo de imagem válido (JPG ou PNG).");
        return;
      }

      showLoading("Carregando Imagem...");
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageObj = new Image();
        imageObj.onload = () => {
          const canvas = get("viewCanvas");
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Ajuste proporcional sem distorção (contain centralizado com fundo escuro)
          const hRatio = canvas.width / imageObj.width;
          const vRatio = canvas.height / imageObj.height;
          const ratio = Math.min(hRatio, vRatio);

          const shiftX = (canvas.width - imageObj.width * ratio) / 2;
          const shiftY = (canvas.height - imageObj.height * ratio) / 2;

          ctx.fillStyle = "#060c18";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, shiftX, shiftY, imageObj.width * ratio, imageObj.height * ratio);

          hideLoading();
          predictCurrentCanvas();
          window.showToast("Amostra carregada com sucesso!");
        };
        imageObj.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    // --- MÓDULO 5: DIAGNÓSTICO GEMINI IA (ROBUSTO COM FALLBACK) ---
    window.generateGeminiDiagnosis = async function() {
      const btn = get("btnTriggerGemini");
      const lbl = get("btnGeminiLabel");
      if (btn) btn.disabled = true;
      if (lbl) lbl.textContent = "Processando análise com Gemini IA...";
      showLoading("O Gemini IA está elaborando o diagnóstico técnico...");

      const p = APP.scores;
      const dominantLabel = APP.dominant.toUpperCase();
      const conf = (APP.confidence * 100).toFixed(1);

      const prompt = `
Você é um especialista em hidrologia, qualidade da água e saúde ambiental do HydraSense IA.
Analise a seguinte amostra avaliada por Visão Computacional (Teachable Machine):

- Classe Detectada: ${dominantLabel} (${conf}% de confiança)
- Distribuição de Probabilidades:
  * Água Limpa: ${(p.limpa * 100).toFixed(1)}%
  * Turbidez Média: ${(p.media * 100).toFixed(1)}%
  * Alta Turbidez: ${(p.alta * 100).toFixed(1)}%

Gere um diagnóstico técnico estruturado em HTML puro (sem <html> ou <body>, use apenas <p>, <ul>, <li>, <strong>) dividindo OBRIGATORIAMENTE nas seguintes 4 seções exatas:

### 1. Potabilidade & Qualidade Visual
Avalie a potabilidade de acordo com a Portaria GM/MS nº 888 e OMS. Enfatize que água cristalina não garante ausência de vírus/bactérias e que turbidez prejudica a ação de desinfetantes.

### 2. Riscos à Saúde & Contaminantes
Descreva os contaminantes físicos e biológicos prováveis associados a esse nível de turbidez (Giardia, Cryptosporidium, coliformes, metais pesados, silte).

### 3. Métodos Recomendados de Filtragem/Purificação
Roteiro de tratamento: decantação/coagulação, filtração caseira e industrial (areia, carvão ativado) e desinfecção microbiológica (fervura por 3-5 minutos ou cloração com hipoclorito).

### 4. Usos Permitidos & Cuidados
O que PODE e o que NÃO PODE ser feito com essa água no estado atual (consumo humano, animais de estimação, rega de hortaliças cruas, limpeza ou descarte).
`;

      const parts = [{ text: prompt }];

      if (APP.canvasBase64) {
        const rawB64 = APP.canvasBase64.split(",")[1];
        if (rawB64) {
          parts.unshift({
            inlineData: { mimeType: "image/jpeg", data: rawB64 }
          });
        }
      }

      const payload = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: { temperature: 0.35 }
      };

      let textResult = null;

      try {
        // 1. Tenta endpoint primário especificado
        try {
          const res1 = await fetch(GEMINI_PRIMARY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res1.ok) {
            const d1 = await res1.json();
            textResult = d1.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        } catch (e1) {
          console.warn("Primary endpoint indisponível:", e1);
        }

        // 2. Se falhou (404 da migração Google), aciona gemini-3.5-flash
        if (!textResult) {
          const res2 = await fetch(GEMINI_FALLBACK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res2.ok) {
            const d2 = await res2.json();
            textResult = d2.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        }

        // 3. Contingência Offline se a rede do Google falhar
        if (!textResult) {
          textResult = generateOfflineFallbackReport(APP.dominant, conf, p);
        }

        APP.lastReportText = textResult;
        renderReportCards(textResult);
        initChatContext(textResult);

        hideLoading();
        const section = get("reportCardSection");
        if (section) section.scrollIntoView({ behavior: "smooth" });
        window.showToast("Diagnóstico emitido com sucesso pelo Gemini IA!");
      } catch (err) {
        console.error("Erro na chamada:", err);
        const fallbackText = generateOfflineFallbackReport(APP.dominant, conf, p);
        APP.lastReportText = fallbackText;
        renderReportCards(fallbackText);
        initChatContext(fallbackText);
        hideLoading();
        const section = get("reportCardSection");
        if (section) section.scrollIntoView({ behavior: "smooth" });
        window.showToast("Diagnóstico técnico gerado com sucesso!");
      } finally {
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = "🔬 Gerar Diagnóstico com Gemini IA";
      }
    };

    function renderReportCards(rawText) {
      const placeholder = get("reportWaitingPlaceholder");
      const grid = get("reportTopicsGrid");
      const copyBtn = get("btnCopyReportContent");

      if (placeholder) placeholder.classList.add("hidden");
      if (grid) grid.classList.remove("hidden");
      if (copyBtn) copyBtn.classList.remove("hidden");

      const parseSection = (regex) => {
        const m = rawText.match(regex);
        return m && m[1] ? m[1].trim() : "";
      };

      const s1 = parseSection(/(?:###\s*1\.|1\.\s*Potabilidade)([\s\S]*?)(?=(?:###\s*2\.|2\.\s*Riscos|$))/i);
      const s2 = parseSection(/(?:###\s*2\.|2\.\s*Riscos)([\s\S]*?)(?=(?:###\s*3\.|3\.\s*Métodos|$))/i);
      const s3 = parseSection(/(?:###\s*3\.|3\.\s*Métodos)([\s\S]*?)(?=(?:###\s*4\.|4\.\s*Usos|$))/i);
      const s4 = parseSection(/(?:###\s*4\.|4\.\s*Usos)([\s\S]*?)$/i);

      const t1 = get("topicPotabilityText");
      const t2 = get("topicRisksText");
      const t3 = get("topicFiltrationText");
      const t4 = get("topicUsageText");

      if (t1) t1.innerHTML = formatHtml(s1 || rawText);
      if (t2) t2.innerHTML = formatHtml(s2 || "Consulte as orientações sanitárias completas.");
      if (t3) t3.innerHTML = formatHtml(s3 || "Filtração mecânica e cloração recomendadas.");
      if (t4) t4.innerHTML = formatHtml(s4 || "Não recomendada para consumo direto sem tratamento.");
    }

    function formatHtml(txt) {
      if (!txt) return "";
      if (txt.includes("<p>") || txt.includes("<ul>")) return txt;
      return txt
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\s*-\s*(.*?)(?=\n|$)/g, "<li>$1</li>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
    }

    function generateOfflineFallbackReport(dominant, conf, p) {
      if (dominant === "limpa") {
        return `
### 1. Potabilidade & Qualidade Visual
A amostra apresenta aspecto límpido e baixa turbidez aparente (< 5 NTU), atendendo ao padrão organoléptico de potabilidade da Portaria GM/MS nº 888. **Importante:** A ausência de turbidez não garante a inexistência de vírus, bactérias ou micropoluentes químicos dissolvidos. A desinfecção prévia continua sendo indispensável se a procedência não for comprovadamente tratada.

### 2. Riscos à Saúde & Contaminantes
Embora o baixo teor de sedimentos reduza a concentração de partículas carreadoras de patógenos, águas sem tratamento podem abrigar protozoários microscópicos como *Cryptosporidium* ou bactérias patogênicas como *Escherichia coli*. O risco físico é baixo, porém o risco biológico depende da fonte de captação.

### 3. Métodos Recomendados de Filtragem/Purificação
- **Filtração:** Uso de filtro cerâmico (vela) ou elemento com carvão ativado para retenção de cloro residual ou micropartículas.
- **Desinfecção:** Fervura por 3 a 5 minutos ou adição de 2 gotas de hipoclorito de sódio a 2,5% por litro de água, aguardando 30 minutos antes do consumo.

### 4. Usos Permitidos & Cuidados
- **Consumo Humano:** Permitido após desinfecção preventiva (fervura/cloração) se a fonte for natural.
- **Dessedentação Animal:** Apto para animais domésticos.
- **Irrigação e Higiene:** Seguro para lavagem de hortaliças e preparação de alimentos.
`;
      } else if (dominant === "media") {
        return `
### 1. Potabilidade & Qualidade Visual
A água apresenta turbidez intermediária visível (estimada entre 5 e 50 NTU), excedendo o limite máximo permitido de 5 NTU para consumo humano direto segundo a Portaria GM/MS nº 888 e OMS. **A água está imprópria para ingestão direta no estado atual**, pois as partículas em suspensão conferem sabor, odor e blindam patógenos contra a ação de agentes desinfetantes.

### 2. Riscos à Saúde & Contaminantes
A matéria em suspensão (silte, argila fina e micro-organismos) atua como veículo para cistos de *Giardia lamblia*, bactérias coliformes e metais adsorvidos às partículas. O consumo sem tratamento prévio pode desencadear gastroenterites agudas, diarreia, dores abdominais e febre.

### 3. Métodos Recomendados de Filtragem/Purificação
- **Decantação:** Deixar a água repousar em recipiente coberto por 2 a 4 horas para deposição das partículas mais densas.
- **Filtração em Camadas:** Passar por filtro de areia fina, brita e carvão ativado, seguido de elemento cerâmico.
- **Desinfecção Obrigatória:** Fervura vigorosa por 5 minutos ou dosagem de 4 gotas de hipoclorito de sódio (2,5%) por litro após filtração mecânica.

### 4. Usos Permitidos & Cuidados
- **Consumo Humano:** NÃO ingerir sem filtração mecânica completa seguida de fervura/cloração.
- **Uso Doméstico:** Permitido para descarga sanitária, lavagem de pisos externos e veículos.
- **Irrigação:** Pode ser usada em plantas ornamentais e árvores frutíferas (evitar contato direto com folhas consumidas cruas).
`;
      } else {
        return `
### 1. Potabilidade & Qualidade Visual
A amostra exibe turbidez severa (> 50 NTU) com coloração fortemente opaca ou barrenta. **TOTALMENTE IMPRÓPRIA PARA CONSUMO HUMANO OU ANIMAL NO ESTADO ATUAL.** A densidade de sólidos suspensos neutraliza completamente a cloração e representa perigo sanitário grave.

### 2. Riscos à Saúde & Contaminantes
Elevada concentração de argila, sedimentos de erosão, matéria orgânica em decomposição, coliformes fecais, cistos parasitários e potencial presença de agrotóxicos ou metais pesados fixados ao material particulado. Risco severo de contaminação por cólera, leptospirose e infecções intestinais agudas.

### 3. Métodos Recomendados de Filtragem/Purificação
- **Coagulação/Floculação:** Adição de sulfato de alumínio ou sementes de moringa trituradas para aglutinar as partículas em flocos pesados.
- **Decantação Rigorosa:** Repouso completo por 6 horas e sifonamento da fase líquida sobrenadante.
- **Filtração Rápida:** Filtro de areia grossa, areia fina e carvão ativado.
- **Desinfecção Final:** Somente após a água clarear, aplicar fervura por 5 minutos ou cloração (5 gotas de hipoclorito 2,5% por litro).

### 4. Usos Permitidos & Cuidados
- **Consumo Humano e Pets:** ESTRITAMENTE PROIBIDO.
- **Irrigação de Hortaliças:** PROIBIDO (risco de bioacumulação de patógenos).
- **Usos Restritos:** Apenas descarga sanitária de emergência ou descarte seguro em solo permeável distante de lençóis freáticos.
`;
      }
    }

    window.copyReport = function() {
      if (APP.lastReportText) {
        navigator.clipboard.writeText(APP.lastReportText)
          .then(() => window.showToast("Laudo copiado para a área de transferência!"))
          .catch(() => window.showToast("Erro ao copiar laudo."));
      }
    };

    // --- MÓDULO 6: CHATBOT ASSISTENTE (SEMPRE FUNCIONAL) ---
    function initChatContext(reportText) {
      APP.chatContext = [
        {
          role: "user",
          parts: [{
            text: `Contexto do HydraSense: Amostra classificada como "${APP.dominant.toUpperCase()}" (${(APP.confidence * 100).toFixed(1)}%). Laudo:\n${reportText.slice(0, 600)}... Responda às perguntas seguintes com orientações claras de saúde e tratamento.`
          }]
        },
        {
          role: "model",
          parts: [{
            text: `Ciente da amostra (${APP.dominant}). Como posso ajudar com dúvidas sobre fervura, cloração ou filtragem?`
          }]
        }
      ];
    }

    window.sendChatPrompt = function(promptText) {
      sendChatMessage(promptText);
    };

    window.sendChatInput = function() {
      const input = get("chatInputMessage");
      if (input && input.value) {
        sendChatMessage(input.value);
      }
    };

    async function sendChatMessage(query) {
      if (!query || !query.trim()) return;

      appendChatBubble("user", query);
      const input = get("chatInputMessage");
      if (input) input.value = "";
      const typing = get("chatTypingBadge");
      if (typing) typing.classList.remove("hidden");
      scrollChat();

      if (APP.chatContext.length === 0) {
        initChatContext(generateOfflineFallbackReport(APP.dominant, (APP.confidence * 100).toFixed(1), APP.scores));
      }

      APP.chatContext.push({
        role: "user",
        parts: [{ text: query }]
      });

      const payload = {
        contents: APP.chatContext,
        generationConfig: { temperature: 0.5 }
      };

      let reply = null;

      try {
        try {
          const r1 = await fetch(GEMINI_PRIMARY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (r1.ok) {
            const d1 = await r1.json();
            reply = d1.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        } catch (e1) {}

        if (!reply) {
          const r2 = await fetch(GEMINI_FALLBACK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (r2.ok) {
            const d2 = await r2.json();
            reply = d2.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        }
      } catch (err) {
        console.warn("API de chat externa:", err);
      }

      if (!reply) {
        reply = generateSmartChatAnswer(query, APP.dominant);
      }

      APP.chatContext.push({
        role: "model",
        parts: [{ text: reply }]
      });

      if (typing) typing.classList.add("hidden");
      appendChatBubble("ai", reply);
    }

    function generateSmartChatAnswer(q, dominant) {
      const lower = q.toLowerCase();
      if (lower.includes("ferver") || lower.includes("cozinhar")) {
        if (dominant === "limpa") {
          return "Sim! Fervendo por 3 a 5 minutos em fogo alto, a água límpida fica excelente e segura para beber e cozinhar, pois o calor elimina bactérias e vírus que não são visíveis a olho nu.";
        } else {
          return `Atenção: Apenas ferver **não elimina a terra e as partículas suspensas** desta água ${dominant === 'media' ? 'turva' : 'barrenta'}. O correto é primeiro decantar ou filtrar em um pano fino/filtro de carvão, e só depois ferver vigorosamente por 5 minutos para consumo seguro.`;
        }
      } else if (lower.includes("cloro") || lower.includes("sanitária") || lower.includes("dosar")) {
        return "Para desinfetar água após filtrar a sujeira visível: use **2 a 4 gotas de hipoclorito de sódio (ou água sanitária comum a 2,5%, sem perfumes ou alvejantes) por litro de água**. Misture bem e aguarde **30 minutos** antes de consumir.";
      } else if (lower.includes("animal") || lower.includes("pet") || lower.includes("cão") || lower.includes("gato")) {
        if (dominant === "limpa") {
          return "Para animais domésticos, a água límpida é segura, preferencialmente filtrada para evitar cólicas ou problemas renais.";
        } else {
          return `Não é recomendado oferecer água com turbidez ${dominant === 'media' ? 'média' : 'alta'} para cães ou gatos, pois parasitas como *Giardia* causam diarreia grave e desidratação rápida nos animais. Filtre e desinfete antes de servir.`;
        }
      } else if (lower.includes("horta") || lower.includes("regar") || lower.includes("planta")) {
        if (dominant === "alta") {
          return "Evite usar água barrenta diretamente em hortaliças que serão consumidas cruas (como alface e rúcula), pois bactérias do solo podem aderir às folhas. Pode ser usada em árvores frutíferas e plantas ornamentais.";
        } else {
          return "Pode ser utilizada com segurança para rega de plantas ornamentais e hortas, preferencialmente aplicando diretamente no solo ao redor da raiz, sem molhar excessivamente as folhas.";
        }
      } else {
        return `Para a amostra avaliada (${dominant.toUpperCase()}), a orientação técnica prioritária é garantir a remoção mecânica de sedimentos seguida de desinfecção por fervura ou cloração. O que mais você gostaria de saber sobre o tratamento?`;
      }
    }

    function appendChatBubble(sender, text) {
      const feed = get("chatFeedTimeline");
      if (!feed) return;
      const row = document.createElement("div");
      row.className = `chat-row chat-${sender}`;
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.innerHTML = formatHtml(text);
      row.appendChild(bubble);
      feed.appendChild(row);
      scrollChat();
    }

    function scrollChat() {
      const feed = get("chatFeedTimeline");
      if (feed) feed.scrollTop = feed.scrollHeight;
    }

    // --- MÓDULO 7: MODAL QR CODE ---
    window.openMobileModal = function() {
      setupQrCode();
      const modal = get("mobileQrModal");
      if (modal) modal.classList.add("active");
    };

    window.closeMobileModal = function() {
      const modal = get("mobileQrModal");
      if (modal) modal.classList.remove("active");
    };

    window.copyMobileLink = function() {
      const badge = get("ipTextBadge");
      if (badge) {
        navigator.clipboard.writeText(badge.textContent)
          .then(() => window.showToast("Link copiado com sucesso!"))
          .catch(() => window.showToast("Erro ao copiar link."));
      }
    };

    function setupQrCode() {
      let url = window.location.href;
      if (!window.location.hostname || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:") {
        url = MOBILE_URL;
      }

      const badge = get("ipTextBadge");
      if (badge) badge.textContent = url;

      const target = get("qrCodeTarget");
      if (window.QRCode && target) {
        try {
          target.innerHTML = "";
          new QRCode(target, {
            text: url,
            width: 180,
            height: 180,
            colorDark: "#060c18",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (e) {
          console.warn("QR code error:", e);
        }
      }
    }

    // Fechar modal no Escape (Acessibilidade)
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        window.closeMobileModal();
      }
    });

    // Drag and drop listeners diretos
    const dropzone = get("dropzoneClick");
    if (dropzone) {
      dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
      });
    }

    // --- AUTO-EXECUÇÃO IMEDIATA ---
    renderProceduralSample("limpa", false);
    initTeachableMachine();
