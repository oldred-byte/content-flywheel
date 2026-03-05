
import openai

client = openai.OpenAI(
    api_key = "n0iHm22xVWfR3tX_rgrfw2C1j0hEYY6Hy7ZIuWEkvJM",  # or os.getenv("POE_API_KEY")
    base_url = "https://api.poe.com/v1",
)

chat = client.chat.completions.create(
    model = "claude-sonnet-4.5",
    messages = [{
      "role": "user",
      "content": "创建一个可以玩贪吃蛇游戏的网页"
    }]
)

print(chat.choices[0].message.content)