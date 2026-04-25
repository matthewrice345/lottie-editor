export const jsonResult = (value) => ({
    content: [
        {
            type: "text",
            text: JSON.stringify(value, null, 2),
        },
    ],
});
//# sourceMappingURL=shared.js.map