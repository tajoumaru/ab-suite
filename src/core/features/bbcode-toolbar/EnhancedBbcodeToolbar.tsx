import {
  AlignLeft,
  Bold,
  Cloud,
  Code,
  EyeOff,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Magnet,
  Palette,
  Play,
  Quote,
  Smile,
  Strikethrough,
  Table,
  TriangleAlert,
  Type,
  Underline,
  User,
} from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useSettingsStore } from "@/lib/state/settings";

interface BBCodeButton {
  icon: () => preact.JSX.Element;
  title: string;
  startTag: string;
  endTag?: string;
}

interface SmileyButton {
  image: string;
  title: string;
  code: string;
}

const bbcodeButtons: BBCodeButton[] = [
  { icon: () => <Bold size={16} />, title: "Bold", startTag: "[b]", endTag: "[/b]" },
  { icon: () => <Italic size={16} />, title: "Italics", startTag: "[i]", endTag: "[/i]" },
  { icon: () => <Underline size={16} />, title: "Underline", startTag: "[u]", endTag: "[/u]" },
  { icon: () => <Strikethrough size={16} />, title: "Strikethrough", startTag: "[s]", endTag: "[/s]" },
  { icon: () => <AlignLeft size={16} />, title: "Align", startTag: "[align=]", endTag: "[/align]" },
  { icon: () => <Palette size={16} />, title: "Color", startTag: "[color=]", endTag: "[/color]" },
  { icon: () => <Type size={16} />, title: "Size", startTag: "[size=]", endTag: "[/size]" },
  { icon: () => <TriangleAlert size={16} />, title: "Spoilers", startTag: "[spoiler]", endTag: "[/spoiler]" },
  { icon: () => <EyeOff size={16} />, title: "Hide", startTag: "[hide]", endTag: "[/hide]" },
  { icon: () => <Code size={16} />, title: "Code", startTag: "[code]", endTag: "[/code]" },
  { icon: () => <Quote size={16} />, title: "Quote", startTag: "[quote]", endTag: "[/quote]" },
  {
    icon: () => <List size={16} />,
    title: "Unordered list",
    startTag: "[ul]\n  [li] [/li]\n[/ul]",
  },
  {
    icon: () => <ListOrdered size={16} />,
    title: "Ordered list",
    startTag: "[ol]\n  [li] [/li]\n[/ol]",
  },
];

const otherButtons: BBCodeButton[] = [
  { icon: () => <Image size={16} />, title: "Image", startTag: "[img]", endTag: "[/img]" },
  { icon: () => <Link size={16} />, title: "URL", startTag: "[url=]", endTag: "[/url]" },
  { icon: () => <User size={16} />, title: "User", startTag: "[user]", endTag: "[/user]" },
  { icon: () => <Magnet size={16} />, title: "Torrent", startTag: "[torrent]", endTag: "[/torrent]" },
  { icon: () => <Play size={16} />, title: "YouTube", startTag: "[youtube]", endTag: "[/youtube]" },
  { icon: () => <Cloud size={16} />, title: "SoundCloud", startTag: "[soundcloud]", endTag: "[/soundcloud]" },
  {
    icon: () => <Table size={16} />,
    title: "Table",
    startTag: "[table]\n  [tr]\n    [th] [/th]\n  [/tr]\n  [tr]\n    [td] [/td]\n  [/tr]\n[/table]",
  },
];

const smileyButtons: SmileyButton[] = [
  { image: "/static/common/smileys/Smile-d144e92715.png", title: "Smile", code: ":)" },
  { image: "/static/common/smileys/Frown-9ca62091bb.png", title: "Frown", code: ":(" },
  { image: "/static/common/smileys/Eh-427f5a1441.png", title: "Eh", code: ":|" },
  { image: "/static/common/smileys/Sarcastic-851bfb73f5.png", title: "Sarcastic", code: "o_O" },
  { image: "/static/common/smileys/Sealed-22710891d2.png", title: "Sealed", code: ":x" },
  { image: "/static/common/smileys/Tongue-a948dbb8ff.png", title: "Tongue", code: ":P" },
  { image: "/static/common/smileys/Undecided-15a71eaf17.png", title: "Undecided", code: ":undecided:" },
  { image: "/static/common/smileys/ohnoes-2f77000e9b.png", title: "OhNoes", code: "x(" },
  { image: "/static/common/smileys/Confused-aa552c0777.png", title: "Confused", code: ":S" },
  { image: "/static/common/smileys/Gasp-21117374e1.png", title: "Gasp", code: ":o" },
  { image: "/static/common/smileys/LargeGasp-0f67a6bf93.png", title: "Large Gasp", code: ":O" },
  { image: "/static/common/smileys/Crying-7a3d365f90.png", title: "Crying", code: ":cry:" },
  { image: "/static/common/smileys/Grin-3ac44e1bb6.png", title: "Grin", code: ":D" },
  { image: "/static/common/smileys/Thumbs_Up-217dda9bd1.png", title: "Thumb Up", code: ":thumbup:" },
  { image: "/static/common/smileys/Thumbs_Down-def71a0f5a.png", title: "Thumb Down", code: ":thumbdown:" },
  { image: "/static/common/smileys/Wink-2023ef3904.png", title: "Wink", code: ";)" },
  { image: "/static/common/smileys/VeryAngry-f5df369632.png", title: "Very Angry", code: ":@" },
  { image: "/static/common/smileys/Sick-1f7e04c309.png", title: "Sick", code: ":sick:" },
  { image: "/static/common/smileys/Angry_Face-01a1555b22.png", title: "Angry Face", code: ":angry:" },
  { image: "/static/common/smileys/Angel-a90748fe3d.png", title: "Angel", code: ":angel:" },
  { image: "/static/common/smileys/Blush-96cc21ce99.png", title: "Blush", code: ":blush:" },
  { image: "/static/common/smileys/Halo-8882b41179.png", title: "Halo", code: ":halo:" },
  { image: "/static/common/smileys/Heart-8e88d42393.png", title: "Heart", code: ":heart:" },
  { image: "/static/common/smileys/Hot-abc80b26ed.png", title: "Hot", code: "8-)" },
  { image: "/static/common/smileys/Kiss-b591b2525f.png", title: "Kiss", code: ":kiss:" },
  { image: "/static/common/smileys/Money-mouth-3ec6d1364e.png", title: "Money Mouth", code: ":money:" },
  { image: "/static/common/smileys/Pirate-46006c14c2.png", title: "Pirate", code: ":pirate:" },
  { image: "/static/common/smileys/ninja-3e3536c287.png", title: "Ninja", code: ":ninja:" },
  { image: "/static/common/smileys/kamina-0dc8440667.png", title: "Kamina", code: ":kamina:" },
  { image: "/static/common/smileys/face_plain-79daf046a4.png", title: "Plain Face", code: ":plainface:" },
  { image: "/static/common/smileys/awesome-c3ba60b50c.png", title: "Awesomeface", code: ":awesomeface:" },
  { image: "/static/common/smileys/nosebleed-f8648a2a65.png", title: "Nosebleed", code: ":nosebleed:" },
  { image: "/static/common/smileys/colonthree-51137fb4be.png", title: ":3", code: ":-3" },
  { image: "/static/common/smileys/coolcustomer-95de2f236c.png", title: "Cool Customer", code: ":coolcustomer:" },
  { image: "/static/common/smileys/wotwot-93c8fc5c40.png", title: "Wotwot", code: ":wotwot:" },
  { image: "/static/common/smileys/talknerdytome-fc8982c598.png", title: "Nerd", code: ":nerd:" },
  { image: "/static/common/smileys/o_o-ad52ee0f60.png", title: "o_o", code: "o_o" },
  { image: "/static/common/smileys/XD-3ce064fd1f.png", title: "XD", code: "XD" },
  { image: "/static/common/smileys/headphones-e2bc73a0b2.png", title: "Headphones", code: ":headphones:" },
  { image: "/static/common/smileys/doh-9144a48ba1.png", title: "Doh", code: ":doh:" },
  { image: "/static/common/smileys/disapproval-1a9c4c5008.png", title: "Disapproval", code: ":disapproval:" },
  {
    image: "/static/common/smileys/soniamdisappoint-448da8341a.png",
    title: "Son, I am disappoint",
    code: ":soniamdisappoint:",
  },
  { image: "/static/common/smileys/whore-06c9a3bff2.png", title: "Whore", code: ":whore:" },
  { image: "/static/common/smileys/facepalm-b1ea73b03c.png", title: "Facepalm", code: ":facepalm:" },
  { image: "/static/common/smileys/~_~-83279a5ed7.png", title: "~_~", code: "~_~" },
  { image: "/static/common/smileys/drool-cfc5271a49.png", title: "Drool", code: ":drool:" },
  { image: "/static/common/smileys/whistle-b7e424cb6a.png", title: "Whistle", code: ":whistle:" },
  { image: "/static/common/smileys/apple-27866d2e22.png", title: "apple", code: ":apple:" },
  { image: "/static/common/smileys/cat-360f027896.png", title: "cat", code: ":cat:" },
  { image: "/static/common/smileys/evil-4daf61b535.png", title: "evil", code: ":evil:" },
  { image: "/static/common/smileys/humanear-4ca0006e06.png", title: "humanear", code: ":humanear:" },
  { image: "/static/common/smileys/love-88af0c354c.png", title: "love", code: ":love:" },
  { image: "/static/common/smileys/makeacontract-990b65d83d.png", title: "makeacontract", code: ":makeacontract:" },
  { image: "/static/common/smileys/yandere-a85f50a624.png", title: "yandere", code: ":yandere:" },
];

export function EnhancedBbcodeToolbar() {
  const settingsStore = useSettingsStore(["enhancedBbcodeToolbarEnabled"]);
  const [showSmileys, setShowSmileys] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Get reference to the quickpost textarea
    textareaRef.current = document.querySelector("#quickpost") as HTMLTextAreaElement;
  }, []);

  if (!settingsStore.enhancedBbcodeToolbarEnabled) {
    return null;
  }

  const insertText = (startTag: string, endTag = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let insertedText: string;
    if (endTag) {
      insertedText = startTag + selectedText + endTag;
    } else {
      insertedText = startTag;
    }

    const newValue = textarea.value.substring(0, start) + insertedText + textarea.value.substring(end);
    textarea.value = newValue;

    // Set cursor position
    const newCursorPos = start + startTag.length + (selectedText ? selectedText.length : 0);
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();

    // Trigger input event for any listeners
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleBBCodeClick = (button: BBCodeButton) => {
    insertText(button.startTag, button.endTag);
  };

  const handleSmileyClick = (smiley: SmileyButton) => {
    insertText(smiley.code);
    setShowSmileys(false);
  };

  return (
    <div
      flex="~ wrap"
      gap="8px"
      p="10px"
      bg="[rgba(0,0,0,0.1)]"
      border="1 solid [rgba(255,255,255,0.1)]"
      rounded="6px"
      mb="10px"
    >
      <div
        flex
        gap="4px"
        items="center"
        position="relative"
        after="content-[''] w-[1px] h-[20px] bg-[rgba(255,255,255,0.2)] mx-[4px]"
      >
        {bbcodeButtons.map((button) => (
          <button
            key={button.title}
            type="button"
            inline-flex
            items="center"
            justify="center"
            size-w-28px
            size-h-28px
            bg="[rgba(255,255,255,0.1)]"
            border="1 solid [rgba(255,255,255,0.2)] rd-4px"
            text="white 14px"
            cursor="pointer"
            transition="all"
            p="0"
            hover="bg-[rgba(255,255,255,0.2)] border-[rgba(255,255,255,0.3)]"
            active="bg-[rgba(255,255,255,0.3)]"
            title={button.title}
            aria-label={button.title}
            onClick={() => handleBBCodeClick(button)}
          >
            <button.icon />
          </button>
        ))}
      </div>

      <div flex gap="4px" items="center" position="relative">
        <button
          type="button"
          inline-flex
          items="center"
          justify="center"
          size-w-28px
          size-h-28px
          bg="[rgba(237,16,106,0.2)]!"
          border="1 solid [rgba(237,16,106,0.4)]! rd-4px"
          text="white 14px"
          cursor="pointer"
          transition="all"
          p="0"
          hover="bg-[rgba(237,16,106,0.3)]! border-[rgba(237,16,106,0.5)]!"
          title="Smileys"
          aria-label="Toggle smileys"
          onClick={() => setShowSmileys(!showSmileys)}
        >
          <Smile size={16} />
        </button>
        {showSmileys && (
          <div
            position="absolute top-full left-0 z-1000"
            bg="#2a2a2a"
            border="1 solid [rgba(255,255,255,0.2)] rd-6px"
            p="8px"
            grid="~ cols-7"
            gap="4px"
            size-w-240px
            max-h="200px"
            overflow-y="auto"
            shadow="[0_4px_12px_rgba(0,0,0,0.3)]"
          >
            {smileyButtons.map((smiley) => (
              <button
                key={smiley.code}
                type="button"
                inline-block
                size-w-24px
                size-h-24px
                border="1 solid transparent"
                rounded="3px"
                cursor="pointer"
                transition="all"
                p="0"
                hover="bg-[rgba(255,255,255,0.1)]! border-[rgba(255,255,255,0.3)]"
                bg="transparent center no-repeat contain"
                style={`background-image: url('${smiley.image}');`}
                title={smiley.title}
                aria-label={smiley.title}
                onClick={() => handleSmileyClick(smiley)}
              />
            ))}
          </div>
        )}
      </div>

      <div flex gap="4px" items="center">
        {otherButtons.map((button) => (
          <button
            key={button.title}
            type="button"
            inline-flex
            items="center"
            justify="center"
            size-w-28px
            size-h-28px
            bg="[rgba(255,255,255,0.1)]"
            border="1 solid [rgba(255,255,255,0.2)] rd-4px"
            text="white 14px"
            cursor="pointer"
            transition="all"
            p="0"
            hover="bg-[rgba(255,255,255,0.2)] border-[rgba(255,255,255,0.3)]"
            active="bg-[rgba(255,255,255,0.3)]"
            title={button.title}
            aria-label={button.title}
            onClick={() => handleBBCodeClick(button)}
          >
            <button.icon />
          </button>
        ))}
      </div>
    </div>
  );
}
