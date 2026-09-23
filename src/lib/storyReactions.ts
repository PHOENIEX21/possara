export const STORY_REACTIONS = [
  {value:"like",label:"Like",emoji:"👍"},
  {value:"love",label:"Love",emoji:"❤️"},
  {value:"care",label:"Care",emoji:"🥰"},
  {value:"haha",label:"Haha",emoji:"😂"},
  {value:"wow",label:"Wow",emoji:"😮"},
  {value:"sad",label:"Sad",emoji:"😢"},
] as const;
export type StoryReaction = typeof STORY_REACTIONS[number]["value"];
