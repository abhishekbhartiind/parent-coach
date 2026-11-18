import { describe, expect, it } from "vitest";
import { screenForRisk } from "@/features/coach/server/safety-screen";

describe("screenForRisk", () => {
  it.each([
    ["My toddler swallowed pills and is very sleepy", "emergency"],
    ["My son swallowed some of my pills and he is very sleepy", "emergency"],
    ["she drank a little of the bleach under the sink", "emergency"],
    ["بچے نے میری دوائی کی گولیاں کھا لیں", "emergency"],
    ["bachay ne goliyan kha li hain", "emergency"],
    ["my husband beats my son when he is angry", "abuse"],
    ["he is not breathing properly", "emergency"],
    ["میرا بچہ بے ہوش ہو گیا ہے", "emergency"],
    ["bachay ne zeher pi liya", "emergency"],
    ["my son says he wants to die", "self_harm"],
    ["she talked about suicide yesterday", "self_harm"],
    ["میرا بیٹا خودکشی کی باتیں کرتا ہے", "self_harm"],
    ["woh khudkushi ki baat kar raha hai", "self_harm"],
    ["I hit my child so hard yesterday and I'm scared", "abuse"],
    ["there are bruises on my daughter and she won't say why", "abuse"],
    ["شوہر بچے کو مار پیٹ کرتا ہے", "abuse"],
  ])("flags %j as %s", (text, expected) => {
    expect(screenForRisk(text)).toBe(expected);
  });

  it.each([
    "My 4 year old throws tantrums at bedtime",
    "He refuses to do homework and screams",
    "میرا بیٹا کھانا نہیں کھاتا",
    "bachay mobile se chipke rehte hain",
    "My kids fight over toys all day",
    "My son hits his sister when he is angry",
    "She took her medicine at 8 and fell asleep fine",
    "He ate dinner quickly and then took his medicine as the doctor said",
  ])("does not flag ordinary concern %j", (text) => {
    expect(screenForRisk(text)).toBe("none");
  });
});
