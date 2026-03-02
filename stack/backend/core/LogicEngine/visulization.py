import matplotlib.pyplot as plt
import seaborn as sns

# Engine 1 visualization
def visualize(df):
    fig, axes = plt.subplots(2, 3, figsize=(15, 8))

    sns.histplot(df['Close'], kde=True, color="Red", ax=axes[0,0])
    axes[0,0].set_title("Close")

    sns.histplot(df['Open'], kde=True, color="Green", ax=axes[0,1])
    axes[0,1].set_title("Open")

    sns.histplot(df['High'], kde=True, color="Blue", ax=axes[0,2])
    axes[0,2].set_title("High")

    sns.histplot(df['Low'], kde=True, color="Orange", ax=axes[1,0])
    axes[1,0].set_title("Low")

    sns.histplot(df['Volume'], kde=True, color="Purple", ax=axes[1,1])
    axes[1,1].set_title("Volume")

    fig.delaxes(axes[1,2])
    plt.show()

# Engine 2 visualization
def visualize_engine2(df):
    fig, axes = plt.subplots(2, 2, figsize=(14, 8))

    axes[0,0].plot(df['Date'], df['Close'])
    axes[0,0].set_title("Close Price Over Time")
    axes[0,0].set_xlabel("Date")
    axes[0,0].set_ylabel("Close")

    sns.histplot(df['Close'], kde=True, color="Blue", ax=axes[0,1])
    axes[0,1].set_title("Close Distribution")

    axes[1,0].plot(df['Date'], df['Volume'])
    axes[1,0].set_title("Volume Over Time")
    axes[1,0].set_xlabel("Date")
    axes[1,0].set_ylabel("Volume")

    sns.histplot(df['Volume'], kde=True, color="Green", ax=axes[1,1])
    axes[1,1].set_title("Volume Distribution")

    plt.tight_layout()
    plt.show()
